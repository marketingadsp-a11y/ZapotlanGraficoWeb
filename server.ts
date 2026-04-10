import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/import-fb", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
      const headers = {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      };
      
      const scrapeResponse = await axios.get(url, { headers, timeout: 10000 });
      const $ = cheerio.load(scrapeResponse.data);
      
      const rawData = {
        imageUrl: $('meta[property="og:image"]').attr('content') || "",
        description: $('meta[property="og:description"]').attr('content') || "",
        title: $('meta[property="og:title"]').attr('content') || $('title').text() || "Facebook Post"
      };

      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

      const prompt = `You are a professional news editor. I will provide you with raw data scraped from a Facebook URL: ${url}.
        Raw Data:
        - Title: ${rawData.title}
        - Description: ${rawData.description}
        Return a JSON object with title, content, summary, categories, tags, imageUrl, isVideo.`;

      const result = await (ai as any).getGenerativeModel({
        model: "gemini-2.0-flash",
      }).generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              summary: { type: Type.STRING },
              categories: { type: Type.ARRAY, items: { type: Type.STRING } },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              imageUrl: { type: Type.STRING },
              isVideo: { type: Type.BOOLEAN },
            },
            required: ["title", "content", "summary", "categories"],
          },
        },
      });

      const parsedResult = JSON.parse(result.response.text() || "{}");
      if (!parsedResult.imageUrl && rawData.imageUrl) parsedResult.imageUrl = rawData.imageUrl;

      res.json(parsedResult);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to import", message: error.message });
    }
  });

  app.post("/api/format-manual", async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    try {
      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

      const prompt = `Format this Facebook post text into a professional news article JSON: "${text}"`;

      const result = await (ai as any).getGenerativeModel({
        model: "gemini-2.0-flash",
      }).generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              summary: { type: Type.STRING },
              categories: { type: Type.ARRAY, items: { type: Type.STRING } },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["title", "content", "summary", "categories"],
          },
        },
      });

      res.json(JSON.parse(result.response.text() || "{}"));
    } catch (error: any) {
      res.status(500).json({ error: "Failed to format", message: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
