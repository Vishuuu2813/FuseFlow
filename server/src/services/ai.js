import KBData from '../models/KBData.js';
import Tenant from '../models/Tenant.js';

export const queryAIResponse = async (tenantId, userMessage) => {
  try {
    const tenant = await Tenant.findById(tenantId);
    const aiLimit = tenant?.limits?.maxAiCredits || 50;
    const usedCredits = tenant?.usage?.aiCreditsUsedThisMonth || 0;

    if (usedCredits >= aiLimit) {
      return 'Thank you for your message. A support representative will get back to you shortly.';
    }

    // 1. Retrieve matching knowledge context from DB using text index
    const kbItems = await KBData.find(
      {
        tenantId,
        $text: { $search: userMessage },
      },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(3);

    let context = '';
    if (kbItems.length > 0) {
      context = kbItems.map((item) => `Document [${item.title}]:\n${item.content}`).join('\n\n');
    }

    const apiKeyGemini = process.env.GEMINI_API_KEY;
    const apiKeyOpenAI = process.env.OPENAI_API_KEY;

    const systemPrompt = `You are a helpful customer support representative. 
Your response must be professional, concise, and friendly.
Here is the business knowledge base context you can use to answer questions:
---
${context}
---
Use the above context to answer the user's message. If the answer cannot be found in the context, answer politely based on general business knowledge or ask them to wait for a support agent. Do not mention that you are an AI or using a document.`;

    // 2. Call Gemini if configured
    if (apiKeyGemini && apiKeyGemini !== 'AIzaSyPlaceholder') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKeyGemini}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: systemPrompt },
                  { text: `User message: ${userMessage}` },
                ],
              },
            ],
          }),
        }
      );
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text) {
        await Tenant.findByIdAndUpdate(tenantId, { $inc: { 'usage.aiCreditsUsedThisMonth': 1 } });
      }
      return text;
    } 
    // 3. Fallback to OpenAI if configured
    else if (apiKeyOpenAI && apiKeyOpenAI !== 'sk-proj-placeholder') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKeyOpenAI}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          max_tokens: 250,
        }),
      });
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      if (text) {
        await Tenant.findByIdAndUpdate(tenantId, { $inc: { 'usage.aiCreditsUsedThisMonth': 1 } });
      }
      return text;
    }

    // 4. Default static response if no AI keys are configured
    return 'Thank you for your message. A support representative will get back to you shortly.';
  } catch (error) {
    return 'Thank you for your message. We are processing your request.';
  }
};
