import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function extractFacebookContent(url: string) {
  try {
    // 1. Scrape raw data from our backend
    const scrapeRes = await fetch('/api/scrape-fb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!scrapeRes.ok) {
      const errorData = await scrapeRes.json();
      throw new Error(errorData.error || `Error ${scrapeRes.status}`);
    }

    const rawData = await scrapeRes.json();

    // 2. Use Gemini to structure the raw data
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a professional news editor. I will provide you with raw data scraped from a Facebook URL: ${url}.
      
      Raw Data:
      - Title: ${rawData.title}
      - Description: ${rawData.description}
      
      CRITICAL INSTRUCTIONS:
      1. Extract the EXACT text from the description as 'content'.
      2. Identify the FIRST hashtags in the text. These are the 'categories'. Return them as an array.
      3. Create a professional headline as 'title'.
      4. Create a concise 2-sentence summary.
      5. Use the provided imageUrl: ${rawData.imageUrl}
      6. Identify if it's a video/reel.
      
      Return a JSON object.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            summary: { type: Type.STRING },
            categories: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            tags: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            imageUrl: { type: Type.STRING },
            videoUrl: { type: Type.STRING },
            isVideo: { type: Type.BOOLEAN },
          },
          required: ["title", "content", "summary", "categories"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    
    // Ensure we use the scraped image if Gemini didn't find a better one
    if (!result.imageUrl && rawData.imageUrl) {
      result.imageUrl = rawData.imageUrl;
    }

    return result;
  } catch (error) {
    console.error("Error extracting FB content:", error);
    throw error;
  }
}

export async function formatManualContent(text: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a professional news editor. I will provide you with a raw text copied from a Facebook post.
      
      Text: "${text}"
      
      Your task is to:
      1. Create a professional headline (title).
      2. Keep the EXACT original text as 'content' (preserve emojis and hashtags).
      3. Create a 2-sentence summary.
      4. Identify the FIRST hashtags in the text as 'categories' (array of strings).
      5. Extract all hashtags into a 'tags' array.
      
      Return a JSON object.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            summary: { type: Type.STRING },
            categories: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            tags: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
          },
          required: ["title", "content", "summary", "categories"],
        },
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error formatting manual content:", error);
    throw error;
  }
}
