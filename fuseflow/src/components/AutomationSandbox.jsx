import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Send, Sparkles, RefreshCw, Trash2 } from 'lucide-react';

const AutomationSandbox = () => {
  const [messages, setMessages] = useState([
    {
      id: 'init',
      sender: 'system',
      text: 'Welcome to the Automation Chat Sandbox! Send any message to test if your Auto-Reply Rules and Decision Branching Flows trigger correctly.',
      time: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [rules, setRules] = useState([]);
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFlowState, setActiveFlowState] = useState(null); // { flowId, currentStepIndex, status }
  const chatEndRef = useRef(null);

  const fetchAutomationData = async () => {
    try {
      setLoading(true);
      const [rulesRes, flowsRes] = await Promise.all([
        api.get('/autoreply'),
        api.get('/flows')
      ]);
      setRules(rulesRes.data || []);
      setFlows(flowsRes.data || []);
    } catch (err) {
      console.error('Failed to load rules or flows for sandbox.', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomationData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    setInputText('');

    // Append user message
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'user',
      text: userMsg,
      time: new Date()
    }]);

    setIsTyping(true);

    // Simulate small latency
    setTimeout(() => {
      processIncomingMessage(userMsg);
    }, 600);
  };

  const executeFlowStep = (flow, stepIdx) => {
    if (stepIdx >= flow.steps.length) {
      setMessages(prev => [...prev, {
        id: Date.now() + '-flow-complete',
        sender: 'system',
        text: `🏁 Decision Flow "${flow.name}" Completed.`,
        time: new Date()
      }]);
      setActiveFlowState(null);
      setIsTyping(false);
      return;
    }

    const step = flow.steps[stepIdx];
    const realDelaySec = step.delaySeconds || 5;
    const simDelayMs = Math.min(8000, Math.max(500, realDelaySec * 150));

    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);

      // Append bot step response
      setMessages(prev => [...prev, {
        id: `${Date.now()}-flow-step-${stepIdx}`,
        sender: 'bot',
        text: step.messageText,
        mediaUrl: step.mediaUrl,
        type: 'flow',
        stepNumber: step.stepNumber || (stepIdx + 1),
        realDelay: realDelaySec,
        time: new Date()
      }]);

      if (step.isWaitStep && step.branches && step.branches.length > 0) {
        // Freeze here and wait for customer response
        setActiveFlowState({
          flowId: flow._id,
          currentStepIndex: stepIdx,
          status: 'AWAITING_INPUT'
        });
        
        const branchKeywords = step.branches.map(b => `[${b.keywords.join(', ')}]`).join(' or ');
        setMessages(prev => [...prev, {
          id: Date.now() + '-flow-waiting',
          sender: 'system',
          text: `⏳ Bot is waiting for response choice: ${branchKeywords}`,
          time: new Date()
        }]);
      } else if (step.autoProgress === false) {
        // Halt and complete the flow path here
        setMessages(prev => [...prev, {
          id: Date.now() + '-flow-complete',
          sender: 'system',
          text: `🏁 Decision Flow "${flow.name}" Completed.`,
          time: new Date()
        }]);
        setActiveFlowState(null);
        setIsTyping(false);
      } else {
        // Auto progress to next step
        const nextIdx = stepIdx + 1;
        setActiveFlowState({
          flowId: flow._id,
          currentStepIndex: nextIdx,
          status: 'RUNNING'
        });
        executeFlowStep(flow, nextIdx);
      }
    }, simDelayMs);
  };

  const processIncomingMessage = (text) => {
    const msg = text.toLowerCase().trim();

    // 1. Check if contact is in flow and awaiting branch choice selection
    if (activeFlowState && activeFlowState.status === 'AWAITING_INPUT') {
      const flow = flows.find(f => f._id === activeFlowState.flowId);
      if (flow) {
        const currentStep = flow.steps[activeFlowState.currentStepIndex];
        if (currentStep && currentStep.isWaitStep) {
          const matchedBranch = currentStep.branches?.find(branch =>
            branch.keywords?.some(kw => msg === kw.toLowerCase().trim() || msg.includes(kw.toLowerCase().trim()))
          );

          if (matchedBranch) {
            const targetIdx = flow.steps.findIndex(s => s.stepNumber === matchedBranch.targetStepNumber);
            if (targetIdx !== -1) {
              setMessages(prev => [...prev, {
                id: Date.now() + '-branch-match',
                sender: 'system',
                text: `🎯 Choice Match: "${text}" -> Routed to Step ${matchedBranch.targetStepNumber}`,
                time: new Date()
              }]);
              executeFlowStep(flow, targetIdx);
              return;
            }
          }
        }
      }
    }

    // 2. Fall back to standard auto-reply or flow keywords triggers
    let matchedRule = null;
    let matchedFlow = null;

    // Check auto reply rules
    for (const rule of rules) {
      if (!rule.isActive) continue;
      let isMatch = false;
      for (const kw of rule.keywords) {
        const keyword = kw.toLowerCase().trim();
        if (rule.matchType === 'EXACT' && msg === keyword) {
          isMatch = true;
          break;
        } else if (rule.matchType === 'CONTAINS' && msg.includes(keyword)) {
          isMatch = true;
          break;
        }
      }
      if (isMatch) {
        matchedRule = rule;
        break;
      }
    }

    // Check conversational flows
    for (const flow of flows) {
      if (!flow.isActive) continue;
      const isMatch = flow.triggerKeywords?.some(kw => {
        const keyword = kw.toLowerCase().trim();
        return msg === keyword || msg.includes(keyword);
      });
      if (isMatch) {
        matchedFlow = flow;
        break;
      }
    }

    setIsTyping(false);

    if (matchedRule) {
      setActiveFlowState(null);
      setMessages(prev => [...prev, {
        id: Date.now() + '-rule',
        sender: 'bot',
        text: matchedRule.replyText,
        mediaUrl: matchedRule.mediaUrl,
        type: 'rule',
        ruleName: matchedRule.keywords.join(', '),
        time: new Date()
      }]);
    } else if (matchedFlow) {
      setMessages(prev => [...prev, {
        id: Date.now() + '-flow-start',
        sender: 'system',
        text: `⚡ Triggered Flow: "${matchedFlow.name}"`,
        time: new Date()
      }]);
      executeFlowStep(matchedFlow, 0);
    } else {
      setMessages(prev => [...prev, {
        id: Date.now() + '-fallback',
        sender: 'system',
        text: activeFlowState && activeFlowState.status === 'AWAITING_INPUT'
          ? '❌ Invalid selection. Please reply with one of the keywords listed above.'
          : '🤖 No automation triggered. Make sure the message matches your rules or flow keywords.',
        time: new Date()
      }]);
    }
  };

  const clearChat = () => {
    setActiveFlowState(null);
    setMessages([
      {
        id: 'init',
        sender: 'system',
        text: 'Chat history cleared. Send a test message to start over.',
        time: new Date()
      }
    ]);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[580px] relative">
      {/* Header */}
      <div className="bg-slate-955 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
              🤖
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-950" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              WhatsFlow Bot Simulator <Sparkles size={13} className="text-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-emerald-400 font-medium tracking-wide uppercase">Active Sandbox Mode</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAutomationData}
            title="Reload Automation Rules"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={clearChat}
            title="Clear Chat History"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-955/60 custom-scrollbar">
        {messages.map((msg) => {
          if (msg.sender === 'system') {
            return (
              <div key={msg.id} className="flex justify-center">
                <span className="px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800/80 text-[10px] font-bold text-slate-400 text-center max-w-[85%]">
                  {msg.text}
                </span>
              </div>
            );
          }

          const isUser = msg.sender === 'user';
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl p-3.5 space-y-2 relative shadow-md ${
                isUser 
                  ? 'bg-emerald-600 text-white rounded-tr-none' 
                  : 'bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-none'
              }`}>
                {/* Meta details if bot message */}
                {!isUser && msg.type === 'rule' && (
                  <span className="block text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 max-w-max">
                    ⚡ Keyword Rule: {msg.ruleName}
                  </span>
                )}
                {!isUser && msg.type === 'flow' && (
                  <span className="block text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 max-w-max">
                    🔄 Flow Step {msg.stepNumber} (Delayed {msg.realDelay}s)
                  </span>
                )}

                {msg.mediaUrl && (
                  <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 max-h-48 flex items-center justify-center p-2">
                    {msg.mediaUrl.match(/\.(mp4|mov|avi)/i) ? (
                      <video src={msg.mediaUrl} controls className="max-h-44 rounded-lg" />
                    ) : (
                      <img src={msg.mediaUrl} alt="Attached Media" className="max-h-44 rounded-lg object-contain" />
                    )}
                  </div>
                )}

                <p className="text-xs font-semibold leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                
                <span className={`block text-[8px] text-right font-medium ${isUser ? 'text-emerald-250' : 'text-slate-500'}`}>
                  {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input panel */}
      <form onSubmit={handleSend} className="bg-slate-950 border-t border-slate-800 p-4 flex gap-2 items-center">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type message to simulate incoming chat..."
          className="flex-1 px-4 py-3 text-xs bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-2xl focus:outline-none focus:border-emerald-600 focus:bg-slate-900/80 font-semibold"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 disabled:hover:bg-emerald-600 text-white rounded-2xl transition-colors cursor-pointer"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};

export default AutomationSandbox;
