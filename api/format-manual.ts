import { GoogleGenAI, Type } from "@google/genai";

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
    if (!apiKey) throw new Error("API Key missing");
    
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
      contents: `Format this Facebook post text into a professional news article JSON: "${text}"`,
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

    res.status(200).json(JSON.parse(result.text || "{}"));
  } catch (error: any) {
    console.error("Format error details:", error);
    res.status(500).json({ 
      error: "Failed to format", 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
