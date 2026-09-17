import axios from "axios";
import * as cheerio from "cheerio";
import { GoogleGenAI, Type } from "@google/genai";

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
        description: $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || "",
        title: $('meta[property="og:title"]').attr('content') || $('title').text() || "Facebook Post"
      };
    } catch (scrapeError: any) {
      console.warn("Scraping failed, proceeding with URL only:", scrapeError.message);
    }

    // 2. Gemini
    if (!apiKey) throw new Error("API Key missing");
    
    const aiPrompt = `You are a professional news editor. I will provide you with raw data scraped from a Facebook URL: ${url}.
      Raw Data:
      - Title: ${rawData.title}
      - Description: ${rawData.description}
      
      Your task is to:
      1. Create a professional headline (title).
      2. Keep the original text as 'content'.
      3. Create a 2-sentence summary.
      4. Identify categories and tags.
      5. Use the provided imageUrl: ${rawData.imageUrl}
      
      Return a JSON object conforming to the schema.`;

    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
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
