import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  app.get("/api/youtube-channel-videos", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: "YouTube URL is required" });
    }

    try {
      let targetUrl = url.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      // 1. Resolve channel ID
      let channelId: string | null = null;
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

      res.json({
        channelId,
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
