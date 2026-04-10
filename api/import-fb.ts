import { GoogleGenAI, Type } from "@google/genai";
import axios from "axios";
import * as cheerio from "cheerio";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    // 1. Scrape
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

    // 2. Gemini
    const result = await (ai as any).getGenerativeModel({
      model: "gemini-2.0-flash",
    }).generateContent({
      contents: [{ role: "user", parts: [{ text: `You are a professional news editor. I will provide you with raw data scraped from a Facebook URL: ${url}.
        Raw Data:
        - Title: ${rawData.title}
        - Description: ${rawData.description}
        Return a JSON object with title, content, summary, categories, tags, imageUrl, isVideo.` }] }],
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

    res.status(200).json(parsedResult);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to import", message: error.message });
  }
}
