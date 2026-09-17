import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const pageUrl = (req.body?.url || req.query?.url || 'https://www.facebook.com/zapotlan.grafico').trim();
    const accessToken = req.body?.accessToken || req.query?.accessToken || process.env.FB_PAGE_ACCESS_TOKEN;
    const headers = {
      'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8'
    };

    let scrapedPosts: any[] = [];

    // If Graph API Access Token is provided, query official Meta Graph API
    if (accessToken) {
      try {
        const pageId = '1497400310513364';
        const graphRes = await axios.get(
          `https://graph.facebook.com/v19.0/${pageId}/posts?fields=id,message,created_time,full_picture,permalink_url,story,attachments{media,type,url}&access_token=${accessToken}&limit=25`,
          { timeout: 10000 }
        );
        if (graphRes.data && Array.isArray(graphRes.data.data)) {
          for (const item of graphRes.data.data) {
            const text = item.message || item.story || '';
            if (!text && !item.full_picture) continue;
            const firstLine = text.split('\n').filter(Boolean)[0] || 'Publicación de Facebook';
            scrapedPosts.push({
              id: item.id,
              title: firstLine.slice(0, 80),
              content: text,
              summary: text.slice(0, 160).replace(/\n/g, ' ') || 'Publicación oficial en Facebook de Zapotlán Gráfico.',
              imageUrl: item.full_picture || '',
              permalink: item.permalink_url || pageUrl,
              published: item.created_time
            });
          }
        }
      } catch (graphErr: any) {
        console.warn("[Facebook Graph API Warning]:", graphErr?.response?.data || graphErr.message);
      }
    }

    if (scrapedPosts.length === 0) {
      try {
        const pageRes = await axios.get(pageUrl, { headers, timeout: 8000 });
        const $ = cheerio.load(pageRes.data);

        const ogTitle = $('meta[property="og:title"]').attr('content') || '';
        const ogDesc = $('meta[property="og:description"]').attr('content') || '';
        const ogImage = $('meta[property="og:image"]').attr('content') || '';

        if (ogDesc && ogDesc.length > 20) {
          const hashId = Buffer.from(ogDesc.slice(0, 40)).toString('hex').slice(0, 12);
          scrapedPosts.push({
            id: hashId,
            title: ogTitle || ogDesc.slice(0, 60),
            content: ogDesc,
            summary: ogDesc.slice(0, 150),
            imageUrl: ogImage,
            permalink: pageUrl
          });
        }
      } catch (e: any) {
        console.warn("Direct Facebook scrape notice:", e.message);
      }
    }

    res.json({
      success: true,
      posts: scrapedPosts,
      message: `Encontradas ${scrapedPosts.length} publicaciones disponibles para sincronizar.`
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to sync Facebook posts", message: err.message });
  }
}
