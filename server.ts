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
  app.post("/api/scrape-fb", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
      // Use Facebook's crawler User-Agent which is more likely to be allowed to see OG tags
      const headers = {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      };
      
      const response = await axios.get(url, { 
        headers,
        timeout: 10000,
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);
      
      // Try multiple selectors for metadata
      const ogImage = $('meta[property="og:image"]').attr('content') || 
                      $('meta[name="twitter:image"]').attr('content') ||
                      $('link[rel="image_src"]').attr('href');
                      
      const ogDescription = $('meta[property="og:description"]').attr('content') || 
                            $('meta[name="description"]').attr('content') ||
                            $('meta[property="og:title"]').attr('content'); // Fallback to title if no description
                            
      const ogTitle = $('meta[property="og:title"]').attr('content') || 
                      $('title').text() || 
                      "Facebook Post";

      res.json({
        imageUrl: ogImage || "",
        description: ogDescription || "",
        title: ogTitle || ""
      });
    } catch (error: any) {
      console.error("Scraping error:", error.message);
      
      // If it's an Axios error with a response, return that status
      if (error.response) {
        return res.status(error.response.status).json({ 
          error: `Facebook returned ${error.response.status}`,
          message: error.message
        });
      }
      
      res.status(500).json({ 
        error: "Failed to scrape Facebook content",
        message: error.message
      });
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
