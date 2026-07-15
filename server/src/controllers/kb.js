import KBData from '../models/KBData.js';
import dns from 'dns/promises';
import net from 'net';

const isPrivateIp = (ip) => {
  if (net.isIP(ip) === 4) {
    const parts = ip.split('.').map(Number);
    return (
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 169 && parts[1] === 254) ||
      parts[0] === 0
    );
  }

  if (net.isIP(ip) === 6) {
    const normalized = ip.toLowerCase();
    return (
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80:')
    );
  }

  return true;
};

const assertSafeCrawlUrl = async (rawUrl) => {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (error) {
    throw new Error('Invalid website URL.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP and HTTPS website URLs are allowed.');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('Localhost URLs are not allowed.');
  }

  const lookupResults = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!lookupResults.length || lookupResults.some((record) => isPrivateIp(record.address))) {
    throw new Error('Private network URLs are not allowed.');
  }

  return parsed.toString();
};

const scrapeWebsiteText = async (url) => {
  const safeUrl = await assertSafeCrawlUrl(url);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const res = await fetch(safeUrl, {
      signal: controller.signal,
      redirect: 'error',
      headers: {
        'User-Agent': 'FuseFlow-KB-Crawler/1.0'
      }
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const html = await res.text();
    
    // Clean scripts, styles, and HTML tags
    const cleanedText = html
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
      .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleanedText.substring(0, 10000); // Truncate to first 10k chars to protect database size
  } catch (error) {
    clearTimeout(timeoutId);
    throw new Error(`Failed to crawl website content: ${error.message}`);
  }
};

export const getKB = async (req, res, next) => {
  try {
    const data = await KBData.find({ tenantId: req.tenantId }).select('-content').sort({ createdAt: -1 });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getKBDetails = async (req, res, next) => {
  try {
    const item = await KBData.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!item) {
      return res.status(404).json({ message: 'Knowledge document not found.' });
    }
    res.json(item);
  } catch (error) {
    next(error);
  }
};

export const createKB = async (req, res, next) => {
  try {
    const { title, type, content, sourceUrl } = req.body;

    if (!title || !type) {
      return res.status(400).json({ message: 'Title and type are required.' });
    }

    let finalContent = content || '';

    if (type === 'WEBSITE') {
      if (!sourceUrl) {
        return res.status(400).json({ message: 'Website URL is required for crawling.' });
      }
      res.status(202).json({ message: 'Crawling started in background.' });
      
      // Execute scraper asynchronously to prevent blocking response thread
      (async () => {
        try {
          const scraped = await scrapeWebsiteText(sourceUrl);
          await KBData.create({
            tenantId: req.tenantId,
            title,
            type: 'WEBSITE',
            sourceUrl,
            content: scraped,
          });
        } catch (err) {
          // Log scrape fail silently or write error flag
        }
      })();
      return;
    }

    if (!finalContent) {
      return res.status(400).json({ message: 'Content body is required.' });
    }

    const kbItem = await KBData.create({
      tenantId: req.tenantId,
      title,
      type,
      content: finalContent,
      sourceUrl: sourceUrl || '',
    });

    res.status(201).json(kbItem);
  } catch (error) {
    next(error);
  }
};

export const deleteKB = async (req, res, next) => {
  try {
    const kbItem = await KBData.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!kbItem) {
      return res.status(404).json({ message: 'Document not found.' });
    }
    res.json({ message: 'Knowledge base document deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
