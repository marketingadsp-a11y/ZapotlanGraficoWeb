import axios from "axios";

export default async function handler(req: any, res: any) {
  // Manejo de preflight CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Accept");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { id, url } = req.query;

  let driveId = id;
  if (!driveId && url) {
    const driveMatch = String(url).match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || String(url).match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      driveId = driveMatch[1];
    }
  }

  if (!driveId) {
    return res.status(400).json({ error: "Missing file id or valid Google Drive URL" });
  }

  const targetUrl = `https://drive.usercontent.google.com/download?id=${driveId}&export=download`;

  try {
    const requestHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };

    if (req.headers.range) {
      requestHeaders["Range"] = req.headers.range;
    }

    const driveRes = await axios.get(targetUrl, {
      headers: requestHeaders,
      responseType: "stream",
      validateStatus: (status) => status >= 200 && status < 400,
      timeout: 25000,
    });

    res.status(driveRes.status);
    res.setHeader("Content-Type", driveRes.headers["content-type"] || "audio/mpeg");
    res.setHeader("Accept-Ranges", "bytes");

    if (driveRes.headers["content-length"]) {
      res.setHeader("Content-Length", driveRes.headers["content-length"]);
    }
    if (driveRes.headers["content-range"]) {
      res.setHeader("Content-Range", driveRes.headers["content-range"]);
    }
    if (driveRes.headers["cache-control"]) {
      res.setHeader("Cache-Control", "public, max-age=86400");
    }

    driveRes.data.pipe(res);
  } catch (error: any) {
    console.error("Error streaming audio from Google Drive:", error?.message);
    if (!res.headersSent) {
      res.status(502).json({ 
        error: "Failed to stream audio from Google Drive", 
        message: error?.message || "Check file sharing permissions (must be public)" 
      });
    }
  }
}
