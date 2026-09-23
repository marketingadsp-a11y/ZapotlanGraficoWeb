import axios from 'axios';
import fs from 'fs';
import path from 'path';

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const DEFAULT_LOGO = "https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,fit=crop,q=95/Yan07pbyryUOG3wG/logo_x400-1-A1azebqb0OtDb6Gz.png";

export default async function handler(req: any, res: any) {
  const { slug } = req.query;
  const target = String(slug || '').trim();

  let title = "Noticias de Zapotlán";
  let description = "Noticias y novedades de Zapotlán y el sur de Jalisco.";
  let imageUrl = DEFAULT_LOGO;
  let canonicalSlug = target;

  if (target) {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/zapotlan-grafico-web/databases/(default)/documents:runQuery`;
      const query = {
        structuredQuery: {
          from: [{ collectionId: 'articles' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'slug' },
              op: 'EQUAL',
              value: { stringValue: target }
            }
          },
          limit: 1
        }
      };
      const response = await axios.post(url, query, { timeout: 4000 });
      const results = response.data;
      if (Array.isArray(results) && results[0] && results[0].document) {
        const docData = results[0].document;
        const fields = docData.fields || {};
        
        title = fields.ogTitle?.stringValue || fields.title?.stringValue || title;
        description = fields.ogDescription?.stringValue || fields.metaDescription?.stringValue || fields.summary?.stringValue || description;
        imageUrl = fields.ogImage?.stringValue || fields.imageUrl?.stringValue || imageUrl;
        canonicalSlug = fields.slug?.stringValue || target;
      }
    } catch (err: any) {
      console.error("Error fetching article in article-ssr:", err.message);
    }
  }

  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeImg = escapeHtml(imageUrl);
  const canonicalUrl = `https://zapotlangrafico.com/nota/${encodeURIComponent(canonicalSlug)}`;

  const ogTags = `
    <title>${safeTitle} | Zapotlán Gráfico</title>
    <meta name="description" content="${safeDesc}" />
    <meta property="og:site_name" content="Zapotlán Gráfico" />
    <meta property="og:title" content="${safeTitle} | Zapotlán Gráfico" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:image" content="${safeImg}" />
    <meta property="og:image:secure_url" content="${safeImg}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle} | Zapotlán Gráfico" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${safeImg}" />
  `;

  let html = "";
  const possiblePaths = [
    path.join(process.cwd(), 'dist', 'index.html'),
    path.join(process.cwd(), 'index.html'),
    path.join(__dirname, '..', 'dist', 'index.html'),
    path.join(__dirname, '..', 'index.html')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        html = fs.readFileSync(p, 'utf-8');
        break;
      } catch {}
    }
  }

  if (html) {
    html = html.replace(/<title>[^<]*<\/title>/gi, '');
    html = html.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
    html = html.replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '');
    html = html.replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, '');
    html = html.replace('</head>', `${ogTags}\n  </head>`);
  } else {
    html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${ogTags}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  return res.status(200).send(html);
}
