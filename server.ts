import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/import-fb", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Configuration Error", message: "GEMINI_API_KEY is not set" });
      }

      let rawData = { imageUrl: "", description: "", title: "Facebook Post" };
      try {
        const headers = {
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        };
        
        const scrapeResponse = await axios.get(url, { headers, timeout: 10000 });
        const $ = cheerio.load(scrapeResponse.data);
        
        rawData = {
          imageUrl: $('meta[property="og:image"]').attr('content') || "",
          description: $('meta[property="og:description"]').attr('content') || "",
          title: $('meta[property="og:title"]').attr('content') || $('title').text() || "Facebook Post"
        };
      } catch (scrapeError: any) {
        console.warn("Scraping failed:", scrapeError.message);
      }

      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const aiPrompt = `You are a professional news editor. I will provide you with raw data scraped from a Facebook URL: ${url}.
        Raw Data:
        - Title: ${rawData.title}
        - Description: ${rawData.description}
        Conform strictly to the JSON schema output.`;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: aiPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Un titular profesional para la nota periodística." },
              content: { type: Type.STRING, description: "El contenido o cuerpo completo del artículo." },
              summary: { type: Type.STRING, description: "Un resumen ejecutivo de dos oraciones." },
              categories: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Lista de categorías sugeridas como Deportes, Comunidad, Cultura, Seguridad, Política." 
              },
              tags: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Etiquetas o hashtags relevantes sin el símbolo #." 
              },
              imageUrl: { type: Type.STRING, description: "La URL de la imagen principal si está disponible." },
              videoUrl: { type: Type.STRING, description: "La URL del video o reel de de Facebook si el post original es de video." }
            },
            required: ["title", "content", "summary"]
          }
        }
      });

      const parsedResult = JSON.parse(result.text || "{}");
      if (!parsedResult.imageUrl && rawData.imageUrl) parsedResult.imageUrl = rawData.imageUrl;

      // Detect if the URL is a Facebook Video or Reel
      const isFacebookVideoUrl = (urlStr: string): boolean => {
        if (!urlStr) return false;
        const lowerUrl = urlStr.toLowerCase();
        return (
          lowerUrl.includes('facebook.com/watch') ||
          lowerUrl.includes('facebook.com/videos') ||
          lowerUrl.includes('/reel/') ||
          lowerUrl.includes('fb.watch') ||
          lowerUrl.includes('facebook.com/share/v')
        );
      };

      if (isFacebookVideoUrl(url)) {
        parsedResult.videoUrl = url;
      }

      res.json(parsedResult);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to import", message: error.message });
    }
  });

  app.post("/api/format-manual", async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Configuration Error", message: "GEMINI_API_KEY is not set" });
      }

      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const aiPrompt = `Format this Facebook post text into a professional news article JSON: "${text}"`;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: aiPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Un titular profesional para la nota periodística." },
              content: { type: Type.STRING, description: "El contenido o cuerpo completo del artículo." },
              summary: { type: Type.STRING, description: "Un resumen ejecutivo de dos oraciones." },
              categories: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Lista de categorías sugeridas como Deportes, Comunidad, Cultura, Seguridad, Política." 
              },
              tags: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Etiquetas o hashtags relevantes sin el símbolo #." 
              },
              imageUrl: { type: Type.STRING, description: "La URL de la imagen principal si está disponible." },
              videoUrl: { type: Type.STRING, description: "La URL del video o reel de de Facebook si se detecta en el texto." }
            },
            required: ["title", "content", "summary"]
          }
        }
      });

      res.json(JSON.parse(result.text || "{}"));
    } catch (error: any) {
      res.status(500).json({ error: "Failed to format", message: error.message });
    }
  });

  // Helpers for Facebook Article Integration
  const generateFacebookSlug = (title: string, postId: string) => {
    const clean = title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const base = clean.slice(0, 60) || 'publicacion-facebook';
    const shortId = (postId || Math.random().toString(36).substring(2, 8)).slice(-6);
    return `${base}-fb-${shortId}`;
  };

  const isFacebookPostDuplicate = async (postId: string) => {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/zapotlan-grafico-web/databases/(default)/documents:runQuery`;
      const query = {
        structuredQuery: {
          from: [{ collectionId: 'articles' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'facebookPostId' },
              op: 'EQUAL',
              value: { stringValue: postId }
            }
          },
          limit: 1
        }
      };
      const res = await axios.post(url, query, { timeout: 4000 });
      if (Array.isArray(res.data) && res.data[0]?.document) {
        return true;
      }
    } catch (err: any) {
      console.warn("Could not check duplicate facebookPostId:", err.message);
    }
    return false;
  };

  const saveFacebookArticleToFirestore = async (article: {
    title: string;
    summary: string;
    content: string;
    imageUrl?: string;
    videoUrl?: string;
    videoAspectRatio?: 'horizontal' | 'vertical';
    slug: string;
    facebookPostId: string;
    createdAt?: string;
  }) => {
    const url = `https://firestore.googleapis.com/v1/projects/zapotlan-grafico-web/databases/(default)/documents/articles`;
    const fields: any = {
      title: { stringValue: article.title },
      summary: { stringValue: article.summary },
      content: { stringValue: article.content },
      categories: {
        arrayValue: {
          values: [{ stringValue: 'Facebook' }]
        }
      },
      subcategories: {
        arrayValue: {
          values: [{ stringValue: 'Publicaciones' }]
        }
      },
      tags: {
        arrayValue: {
          values: [
            { stringValue: 'Facebook' },
            { stringValue: 'Zapotlán Gráfico' },
            { stringValue: 'Comunidad' }
          ]
        }
      },
      author: { stringValue: 'Facebook - Zapotlán Gráfico' },
      createdAt: { timestampValue: article.createdAt || new Date().toISOString() },
      views: { integerValue: '0' },
      interactions: { integerValue: '0' },
      slug: { stringValue: article.slug },
      facebookPostId: { stringValue: article.facebookPostId }
    };

    if (article.imageUrl) fields.imageUrl = { stringValue: article.imageUrl };
    if (article.videoUrl) fields.videoUrl = { stringValue: article.videoUrl };
    if (article.videoAspectRatio) fields.videoAspectRatio = { stringValue: article.videoAspectRatio };

    const res = await axios.post(url, { fields });
    return res.data;
  };

  // Facebook Webhook Handshake for Meta for Developers / Zapier / Make
  app.get("/api/webhook-facebook", (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe') {
      console.log("[Facebook Webhook] Verified challenge received from Meta");
      return res.status(200).send(challenge);
    }
    res.json({
      status: "online",
      message: "Endpoint receptor de Webhooks de Facebook activo. Conéctalo desde Meta for Developers, Zapier, Make o RSS.app."
    });
  });

  // Facebook Webhook Receiver: Saves incoming posts into Firestore exclusively under 'Facebook' category
  app.post("/api/webhook-facebook", async (req, res) => {
    try {
      const body = req.body;
      let incomingItems: any[] = [];

      if (body.entry && Array.isArray(body.entry)) {
        // Meta Graph API Webhook format
        for (const entry of body.entry) {
          if (entry.changes && Array.isArray(entry.changes)) {
            for (const change of entry.changes) {
              if (change.field === 'feed' && change.value) {
                const val = change.value;
                if (val.verb === 'add' || !val.verb) {
                  incomingItems.push({
                    id: val.post_id || val.id || `${entry.id}_${Date.now()}`,
                    message: val.message || val.description || '',
                    link: val.link || val.permalink_url || 'https://www.facebook.com/zapotlan.grafico',
                    photos: val.photos || (val.photo ? [val.photo] : []),
                    videoUrl: val.video || (val.item === 'video' ? val.link : '')
                  });
                }
              }
            }
          }
        }
      } else if (body.id || body.message || body.text || body.content) {
        // Direct format (Zapier, Make.com, RSS.app, custom payload)
        incomingItems.push({
          id: String(body.id || body.postId || Date.now()),
          message: body.message || body.text || body.content || body.title || '',
          title: body.title,
          link: body.link || body.url || body.permalink || 'https://www.facebook.com/zapotlan.grafico',
          photos: body.photos || (body.imageUrl || body.image ? [body.imageUrl || body.image] : []),
          videoUrl: body.videoUrl || body.video || '',
          published: body.published || body.created_time
        });
      }

      if (incomingItems.length === 0) {
        return res.json({ success: true, message: "No actionable post items found in payload" });
      }

      let createdCount = 0;
      for (const item of incomingItems) {
        const postId = item.id;
        const isDup = await isFacebookPostDuplicate(postId);
        if (isDup) {
          console.log(`[Facebook Webhook] Post ${postId} already exists in Firestore, skipping.`);
          continue;
        }

        let rawText = (item.message || '').trim();
        let title = item.title;
        if (!title || title.length < 5) {
          const firstLine = rawText.split('\n')[0].replace(/[#*]/g, '').trim();
          title = firstLine.length > 5 && firstLine.length < 120 
            ? firstLine 
            : `Publicación de Facebook: ${firstLine.slice(0, 80) || 'Actualización de Zapotlán Gráfico'}`;
        }

        const slug = generateFacebookSlug(title, postId);
        const summary = rawText.slice(0, 160).replace(/\n/g, ' ') || 'Publicación oficial compartida en Facebook por Zapotlán Gráfico.';
        const imageUrl = item.photos?.[0] || '';
        const permalink = item.link || 'https://www.facebook.com/zapotlan.grafico';

        const content = `${rawText}

---
[Ver publicación original en Facebook](${permalink})`;

        await saveFacebookArticleToFirestore({
          title,
          summary,
          content,
          imageUrl,
          videoUrl: item.videoUrl || (permalink.includes('/reel/') || permalink.includes('/videos/') ? permalink : ''),
          videoAspectRatio: (item.videoUrl?.includes('/reel/') || permalink.includes('/reel/')) ? 'vertical' : 'horizontal',
          slug,
          facebookPostId: postId,
          createdAt: item.published ? new Date(item.published).toISOString() : new Date().toISOString()
        });

        createdCount++;
        console.log(`[Facebook Webhook] Published article from post: ${title} (${postId})`);
      }

      res.json({ success: true, createdCount, processedCount: incomingItems.length });
    } catch (err: any) {
      console.error("[Facebook Webhook Error]:", err.message);
      res.status(500).json({ error: "Failed to process Facebook webhook", details: err.message });
    }
  });

  // Facebook page sync endpoint
  app.post("/api/sync-facebook-posts", async (req, res) => {
    try {
      const pageUrl = (req.body.url || 'https://www.facebook.com/zapotlan.grafico').trim();
      const accessToken = req.body.accessToken || process.env.FB_PAGE_ACCESS_TOKEN;
      const headers = {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8'
      };

      let scrapedPosts: any[] = [];

      // If Graph API Access Token is provided, query official Meta Graph API
      if (accessToken) {
        try {
          const pageId = '1497400310513364';
          const graphRes = await axios.get(
            `https://graph.facebook.com/v19.0/${pageId}/posts?fields=id,message,created_time,full_picture,permalink_url,story,attachments{media,type,url}&access_token=${accessToken}&limit=25`,
            { timeout: 10000 }
          );
          if (graphRes.data && Array.isArray(graphRes.data.data)) {
            for (const item of graphRes.data.data) {
              const text = item.message || item.story || '';
              if (!text && !item.full_picture) continue;
              const firstLine = text.split('\n').filter(Boolean)[0] || 'Publicación de Facebook';
              scrapedPosts.push({
                id: item.id,
                title: firstLine.slice(0, 80),
                content: text,
                summary: text.slice(0, 160).replace(/\n/g, ' ') || 'Publicación oficial en Facebook de Zapotlán Gráfico.',
                imageUrl: item.full_picture || '',
                permalink: item.permalink_url || pageUrl,
                published: item.created_time
              });
            }
          }
        } catch (graphErr: any) {
          console.warn("[Facebook Graph API Warning]:", graphErr?.response?.data || graphErr.message);
        }
      }

      // If no token or no posts yet, fallback to scraping
      if (scrapedPosts.length === 0) {
        try {
          const pageRes = await axios.get(pageUrl, { headers, timeout: 8000 });
          const $ = cheerio.load(pageRes.data);

          const ogTitle = $('meta[property="og:title"]').attr('content') || '';
          const ogDesc = $('meta[property="og:description"]').attr('content') || '';
          const ogImage = $('meta[property="og:image"]').attr('content') || '';

          if (ogDesc && ogDesc.length > 20) {
            const hashId = Buffer.from(ogDesc.slice(0, 40)).toString('hex').slice(0, 12);
            scrapedPosts.push({
              id: hashId,
              title: ogTitle || ogDesc.slice(0, 60),
              content: ogDesc,
              summary: ogDesc.slice(0, 150),
              imageUrl: ogImage,
              permalink: pageUrl
            });
          }
        } catch (e: any) {
          console.warn("Direct Facebook scrape notice:", e.message);
        }
      }

      res.json({
        success: true,
        posts: scrapedPosts,
        message: `Se encontraron ${scrapedPosts.length} publicaciones para sincronizar.`
      });
    } catch (err: any) {
      console.error("Error in sync-facebook-posts:", err.message);
      res.status(500).json({ error: "Failed to sync Facebook posts", message: err.message });
    }
  });

  app.get("/api/youtube-channel-videos", async (req, res) => {
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

      const cleanUrl = targetUrl.replace(/\/+$/, '').replace(/\/(videos|streams)$/, '');
      const videosUrl = `${cleanUrl}/videos`;
      const streamsUrl = `${cleanUrl}/streams`;

      const headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      };

      const parseRelativeDate = (str: string): number => {
        if (!str) return 0;
        const lower = str.toLowerCase();
        const timestamp = Date.parse(str);
        if (!isNaN(timestamp)) return timestamp;

        const now = Date.now();
        const MINUTE = 60 * 1000;
        const HOUR = 60 * MINUTE;
        const DAY = 24 * HOUR;
        const WEEK = 7 * DAY;
        const MONTH = 30 * DAY;
        const YEAR = 365 * DAY;

        const timeMatch = lower.match(/(?:hace|hace\s+un|hace\s+una)?\s*(\d+)?\s*(segundo|minuto|hora|d[íi]a|semana|mes|a[ñn]o)/);
        let num = 1;
        let unit = "";
        if (timeMatch) {
          if (timeMatch[1]) num = parseInt(timeMatch[1], 10);
          unit = timeMatch[2];
        } else {
          const fallbackNum = lower.match(/hace\s+(\d+)/);
          if (fallbackNum) num = parseInt(fallbackNum[1], 10);
        }

        if (unit.startsWith("seg") || unit.startsWith("min")) return now - num * MINUTE;
        if (unit.startsWith("hor")) return now - num * HOUR;
        if (unit.startsWith("d")) return now - num * DAY;
        if (unit.startsWith("sem")) return now - num * WEEK;
        if (unit.startsWith("mes")) return now - num * MONTH;
        if (unit.startsWith("a")) return now - num * YEAR;

        return now - 100 * DAY;
      };

      const parseVideosFromHtml = (html: string, isStreamDefault = false) => {
        const videos: any[] = [];
        const seenIds = new Set<string>();
        let channelId: string | null = null;

        const match = html.match(/var ytInitialData = ({.*?});<\/script>/s) || html.match(/ytInitialData\s*=\s*({.+?});/s);
        if (match) {
          try {
            const data = JSON.parse(match[1]);
            channelId = data.metadata?.channelMetadataRenderer?.externalId || null;

            const traverse = (node: any) => {
              if (!node || typeof node !== "object") return;

              // Modern YouTube format (lockupViewModel)
              if (node.lockupViewModel && node.lockupViewModel.contentId) {
                const lvm = node.lockupViewModel;
                const id = lvm.contentId;
                if (!seenIds.has(id)) {
                  seenIds.add(id);
                  const title = lvm.metadata?.lockupMetadataViewModel?.title?.content ||
                                lvm.rendererContext?.accessibilityContext?.label || "";
                  const metaParts = lvm.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts || [];
                  const published = metaParts.map((p: any) => p.text?.content).filter(Boolean).join(" • ") || "";
                  const isLive = published.toLowerCase().includes("transmitido") || published.toLowerCase().includes("en vivo") || isStreamDefault;
                  const thumbSources = lvm.contentImage?.thumbnailViewModel?.image?.sources || [];
                  const thumbnail = thumbSources[thumbSources.length - 1]?.url || `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
                  videos.push({
                    id,
                    title,
                    videoUrl: `https://www.youtube.com/watch?v=${id}`,
                    published,
                    thumbnail,
                    isLiveStream: isLive,
                    type: isLive ? "stream" : "video"
                  });
                }
              }

              // Classic YouTube format (videoRenderer)
              if (node.videoRenderer && node.videoRenderer.videoId) {
                const vr = node.videoRenderer;
                const id = vr.videoId;
                if (!seenIds.has(id)) {
                  seenIds.add(id);
                  const title = vr.title?.runs?.map((r: any) => r.text).join("") || vr.title?.simpleText || "";
                  const published = vr.publishedTimeText?.simpleText || "";
                  const isLive = published.toLowerCase().includes("transmitido") || isStreamDefault;
                  const thumbSources = vr.thumbnail?.thumbnails || [];
                  const thumbnail = thumbSources[thumbSources.length - 1]?.url || `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
                  videos.push({
                    id,
                    title,
                    videoUrl: `https://www.youtube.com/watch?v=${id}`,
                    published,
                    thumbnail,
                    isLiveStream: isLive,
                    type: isLive ? "stream" : "video"
                  });
                }
              }

              for (const key of Object.keys(node)) {
                traverse(node[key]);
              }
            };

            traverse(data);
          } catch (e: any) {
            console.warn("ytInitialData parse error:", e.message);
          }
        }

        if (!channelId) {
          const idMatch = html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
          if (idMatch) {
            channelId = idMatch[1];
          } else {
            const cMatch = html.match(/channel\/(UC[a-zA-Z0-9_-]{22})/);
            if (cMatch) channelId = cMatch[1];
          }
        }

        return { channelId, videos };
      };

      let videos: any[] = [];
      let channelId: string | null = null;
      const seenIds = new Set<string>();

      // Fetch both /videos and /streams in parallel for complete coverage
      const [videosRes, streamsRes] = await Promise.allSettled([
        axios.get(encodeURI(videosUrl), { headers, timeout: 10000 }),
        axios.get(encodeURI(streamsUrl), { headers, timeout: 10000 })
      ]);

      if (streamsRes.status === "fulfilled") {
        const parsed = parseVideosFromHtml(streamsRes.value.data, true);
        if (parsed.channelId) channelId = parsed.channelId;
        for (const v of parsed.videos) {
          if (!seenIds.has(v.id)) {
            seenIds.add(v.id);
            videos.push(v);
          }
        }
      }

      if (videosRes.status === "fulfilled") {
        const parsed = parseVideosFromHtml(videosRes.value.data, false);
        if (parsed.channelId && !channelId) channelId = parsed.channelId;
        for (const v of parsed.videos) {
          if (!seenIds.has(v.id)) {
            seenIds.add(v.id);
            videos.push(v);
          }
        }
      }

      // Sort all videos chronologically (newest first)
      if (videos.length > 0) {
        videos.sort((a, b) => parseRelativeDate(b.published) - parseRelativeDate(a.published));
      }

      // 2. Fallback attempt: fetch channel root if 0 videos
      if (videos.length === 0) {
        try {
          const homeRes = await axios.get(encodeURI(cleanUrl), { headers, timeout: 10000 });
          const parsed = parseVideosFromHtml(homeRes.data);
          if (!channelId) channelId = parsed.channelId;
          if (parsed.videos.length > 0) videos = parsed.videos;
        } catch (err: any) {
          console.warn("YouTube channel root scrape failed:", err.message);
        }
      }

      // 3. Fallback attempt: RSS Feed if still 0 videos
      if (videos.length === 0 && channelId) {
        try {
          const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
          const feedRes = await axios.get(encodeURI(feedUrl), { headers, timeout: 6000 });
          const $feed = cheerio.load(feedRes.data, { xmlMode: true });

          $feed('entry').each((_, entry) => {
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
            let thumbnail = $entry.find('media\\:group media\\:thumbnail, group thumbnail').attr('url') ||
                            (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '');

            if (videoId && !seenIds.has(videoId)) {
              seenIds.add(videoId);
              videos.push({
                id: videoId,
                title,
                videoUrl: link,
                published,
                thumbnail,
                isLiveStream: false,
                type: "video"
              });
            }
          });
        } catch (feedErr: any) {
          console.warn("YouTube RSS feed fallback also failed:", feedErr.message);
        }
      }

      // 4. Default fallback channel ID for Zapotlán Gráfico if still missing
      const normalizedLower = targetUrl.toLowerCase();
      if (!channelId && (normalizedLower.includes("zapotlan") || normalizedLower.includes("zapotlán"))) {
        channelId = "UC6xwxt0tXYDUs3WTClcQO3w";
      }

      if (!channelId && videos.length === 0) {
        return res.status(404).json({ error: "Could not find a YouTube Channel or videos for the provided URL." });
      }

      res.json({
        channelId: channelId || "UC6xwxt0tXYDUs3WTClcQO3w",
        videos
      });
    } catch (err: any) {
      console.error("YouTube parse error:", err.message);
      res.status(500).json({ error: "Failed to fetch YouTube channel videos", details: err.message });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Serve static files but disable index.html automatically on root folders so we can intercept
    app.use(express.static(distPath, { index: false }));

    // Helper to fetch article meta from Firestore REST API
    const getArticleDetails = async (slug: string) => {
      try {
        const url = `https://firestore.googleapis.com/v1/projects/zapotlan-grafico-web/databases/(default)/documents:runQuery`;
        const query = {
          structuredQuery: {
            from: [{ collectionId: 'articles' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'slug' },
                op: 'EQUAL',
                value: { stringValue: slug }
              }
            },
            limit: 1
          }
        };
        const response = await axios.post(url, query, { timeout: 4000 });
        const results = response.data;
        if (Array.isArray(results) && results[0] && results[0].document) {
          const doc = results[0].document;
          const fields = doc.fields || {};
          
          return {
            title: fields.title?.stringValue || "",
            summary: fields.summary?.stringValue || "",
            imageUrl: fields.imageUrl?.stringValue || "",
            metaDescription: fields.metaDescription?.stringValue || "",
            ogTitle: fields.ogTitle?.stringValue || "",
            ogDescription: fields.ogDescription?.stringValue || "",
            ogImage: fields.ogImage?.stringValue || ""
          };
        }
      } catch (err: any) {
        console.error("Error fetching article description for dynamic meta tags:", err.message);
      }
      return null;
    };

    // Helper to inject meta tags into index.html
    const injectMetaTags = (html: string, article: any) => {
      if (!article) return html;

      const title = article.title || "Zapotlán Gráfico";
      const desc = (article.metaDescription || article.summary || "Noticias y novedades de Zapotlán.").replace(/"/g, '&quot;');
      const ogTitle = (article.ogTitle || article.title || title).replace(/"/g, '&quot;');
      const ogDesc = (article.ogDescription || desc).replace(/"/g, '&quot;');
      const ogImage = article.ogImage || article.imageUrl || "";

      const tags = `
  <title>${title} | Zapotlán Gráfico</title>
  <meta name="description" content="${desc}" />
  <meta property="og:title" content="${ogTitle}" />
  <meta property="og:description" content="${ogDesc}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${ogTitle}" />
  <meta name="twitter:description" content="${ogDesc}" />
  <meta name="twitter:image" content="${ogImage}" />
`;

      let output = html;
      // Replace existing title if any
      if (output.includes("<title>")) {
        output = output.replace(/<title>[^<]*<\/title>/, "");
      }
      // Insert right before </head>
      output = output.replace("</head>", `${tags}</head>`);
      return output;
    };

    // Intercept article route to inject dynamic SEO/OpenGraph tags
    app.get('/nota/:slug', async (req, res) => {
      const { slug } = req.params;
      const indexHtmlPath = path.join(distPath, 'index.html');
      
      try {
        let html = fs.readFileSync(indexHtmlPath, 'utf-8');
        const article = await getArticleDetails(slug);
        
        if (article) {
          html = injectMetaTags(html, article);
        }
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
      } catch (e: any) {
        console.error("SEO pre-rendering error:", e.message);
        return res.sendFile(indexHtmlPath);
      }
    });

    // Default route for SPA
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const listenWithFallback = (port: number) => {
    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${port}`);
    });

    server.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`Port ${port} is in use, trying port ${port + 1}...`);
        listenWithFallback(port + 1);
      } else {
        console.error("Server error:", err);
      }
    });
  };

  listenWithFallback(PORT);
}

startServer();
