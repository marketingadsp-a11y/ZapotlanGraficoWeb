import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: "YouTube URL is required" });
  }

  try {
    let rawUrl = url.trim();
    
    // Decode first to prevent potential double encodings (e.g., %C3%A1 -> á)
    try {
      rawUrl = decodeURIComponent(rawUrl);
    } catch (e) {
      // Fallback if decoding fails
    }

    let targetUrl = rawUrl;
    
    // Support patterns like: "@ZapotlanGraficoMX", "ZapotlanGraficoMX", and full custom URLs
    if (targetUrl.startsWith('@')) {
      targetUrl = 'https://www.youtube.com/' + targetUrl;
    } else if (!targetUrl.toLowerCase().includes('youtube.com') && !targetUrl.toLowerCase().includes('youtu.be')) {
      targetUrl = 'https://www.youtube.com/@' + targetUrl;
    } else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    // 1. Resolve channel ID
    let channelId: string | null = null;

    // Leverage instant lookups for matching Zapotlán handles to bypass YouTube external bot blocking
    const normalizedLower = targetUrl.toLowerCase();
    if (normalizedLower.includes("zapotlan") || normalizedLower.includes("zapotlán")) {
      channelId = "UC6xwxt0tXYDUs3WTClcQO3w";
    }

    if (!channelId) {
      const channelIdMatch = targetUrl.match(/(?:channel\/|UC)([a-zA-Z0-9_-]{22})/);
      
      if (channelIdMatch) {
        channelId = 'UC' + channelIdMatch[1];
      } else {
        // Scrape YT channel page to extract channel ID or direct RSS feed
        const scrapeRes = await axios.get(encodeURI(targetUrl), {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
          },
          timeout: 8000
        });

        const $ = cheerio.load(scrapeRes.data);
        
        // Try application/rss+xml link
        const rssHref = $('link[type="application/rss+xml"]').attr('href');
        if (rssHref) {
          const idMatch = rssHref.match(/channel_id=([^&]+)/);
          if (idMatch) channelId = idMatch[1];
        }

        // Try itemprop meta tag
        if (!channelId) {
          channelId = $('meta[itemprop="channelId"]').attr('content') || null;
        }

        // Try body text search for patterns
        if (!channelId) {
          const bodyText = scrapeRes.data;
          const metaMatch = bodyText.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
          if (metaMatch) {
            channelId = metaMatch[1];
          } else {
            const rUrlMatch = bodyText.match(/https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/);
            if (rUrlMatch) channelId = rUrlMatch[1];
          }
        }
      }
    }

    if (!channelId) {
      return res.status(404).json({ error: "Could not find a YouTube Channel ID for the provided URL." });
    }

    // 2. Fetch the XML RSS feed
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const feedRes = await axios.get(encodeURI(feedUrl), { timeout: 6000 });
    const $feed = cheerio.load(feedRes.data, { xmlMode: true });

    const videos: any[] = [];
    $feed('entry').each((i, entry) => {
      const $entry = $feed(entry);
      let videoId = $entry.find('yt\\:videoId').text() || $entry.find('videoId').text();
      if (!videoId) {
        const idText = $entry.find('id').text() || '';
        const match = idText.match(/yt:video:(.+)/);
        if (match) videoId = match[1];
      }
      
      const title = $entry.find('title').text();
      const link = $entry.find('link').attr('href') || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : '');
      const published = $entry.find('published').text();
      
      let thumbnail = '';
      const mediaThumb = $entry.find('media\\:group media\\:thumbnail, group thumbnail').attr('url');
      if (mediaThumb) {
        thumbnail = mediaThumb;
      } else if (videoId) {
        thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }

      if (videoId) {
        videos.push({
          id: videoId,
          title,
          videoUrl: link,
          published,
          thumbnail
        });
      }
    });

    res.status(200).json({
      channelId,
      videos
    });
  } catch (err: any) {
    console.error("YouTube parse error:", err.message);
    res.status(500).json({ error: "Failed to fetch YouTube channel videos", details: err.message });
  }
}
