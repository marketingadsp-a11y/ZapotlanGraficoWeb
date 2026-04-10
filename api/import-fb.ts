import axios from "axios";
import * as cheerio from "cheerio";
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("GEMINI_API_KEY present:", !!apiKey);
    if (!apiKey) {
      return res.status(500).json({ error: "Configuration Error", message: "GEMINI_API_KEY is not set in environment variables" });
    }

    // 1. Scrape
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
      console.warn("Scraping failed, proceeding with URL only:", scrapeError.message);
      // We continue because Gemini might still be able to do something with just the URL or we can fallback
    }

    // 2. Gemini
    const GenAIModule = await import("@google/genai");
    // @ts-ignore
    const GoogleGenerativeAI = GenAIModule.GoogleGenerativeAI || GenAIModule.GoogleGenAI;
    
    if (!GoogleGenerativeAI) {
      throw new Error(`SDK Error: GoogleGenerativeAI class not found. Available keys: ${Object.keys(GenAIModule).join(', ')}`);
    }

    const genAI = new (GoogleGenerativeAI as any)(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const prompt = `You are a professional news editor. I will provide you with raw data scraped from a Facebook URL: ${url}.
      Raw Data:
      - Title: ${rawData.title}
      - Description: ${rawData.description}
      
      Your task is to:
      1. Create a professional headline (title).
      2. Keep the original text as 'content'.
      3. Create a 2-sentence summary.
      4. Identify categories and tags.
      5. Use the provided imageUrl: ${rawData.imageUrl}
      
      Return a JSON object.`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const response = await result.response;
    const parsedResult = JSON.parse(response.text() || "{}");
    
    if (!parsedResult.imageUrl && rawData.imageUrl) parsedResult.imageUrl = rawData.imageUrl;

    res.status(200).json(parsedResult);
  } catch (error: any) {
    console.error("Import error details:", error);
    res.status(500).json({ 
      error: "Failed to import", 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
