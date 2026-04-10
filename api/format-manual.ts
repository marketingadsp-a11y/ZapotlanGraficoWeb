import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required" });

  try {
    const result = await (ai as any).getGenerativeModel({
      model: "gemini-2.0-flash",
    }).generateContent({
      contents: [{ role: "user", parts: [{ text: `Format this Facebook post text into a professional news article JSON: "${text}"` }] }],
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

    res.status(200).json(JSON.parse(result.response.text() || "{}"));
  } catch (error: any) {
    res.status(500).json({ error: "Failed to format", message: error.message });
  }
}
