import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required" });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("GEMINI_API_KEY present:", !!apiKey);
    if (!apiKey) {
      return res.status(500).json({ error: "Configuration Error", message: "GEMINI_API_KEY is not set in environment variables" });
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

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: `Format this Facebook post text into a professional news article JSON: "${text}"` }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const response = await result.response;
    res.status(200).json(JSON.parse(response.text() || "{}"));
  } catch (error: any) {
    console.error("Format error details:", error);
    res.status(500).json({ 
      error: "Failed to format", 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
