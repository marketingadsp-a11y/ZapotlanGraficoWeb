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
  const { slugOrId } = req.query;
  const target = String(slugOrId || '').trim();

  let title = "Revista Digital";
  let description = "Lee la edición interactiva de la revista digital de Zapotlán Gráfico.";
  let coverUrl = DEFAULT_LOGO;
  let canonicalSlug = target;

  if (target) {
    try {
      const queryUrl = `https://firestore.googleapis.com/v1/projects/zapotlan-grafico-web/databases/(default)/documents:runQuery`;
      
      // 1. Buscar por slug exacto
      const query = {
        structuredQuery: {
          from: [{ collectionId: 'flipbooks' }],
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

      const response = await axios.post(queryUrl, query, { timeout: 4000 });
      let docData: any = null;

      if (Array.isArray(response.data) && response.data[0] && response.data[0].document) {
        docData = response.data[0].document;
      } else {
        // 2. Fallback: buscar por ID de documento de Firestore
        try {
          const directUrl = `https://firestore.googleapis.com/v1/projects/zapotlan-grafico-web/databases/(default)/documents/flipbooks/${encodeURIComponent(target)}`;
          const directResp = await axios.get(directUrl, { timeout: 4000 });
          if (directResp.data && directResp.data.fields) {
            docData = directResp.data;
          }
        } catch {
          // No encontrado por ID directo
        }
      }

      // 3. Fallback inteligente: buscar coincidencias parciales de slug
      if (!docData) {
        try {
          const allQuery = {
            structuredQuery: {
              from: [{ collectionId: 'flipbooks' }],
              limit: 30
            }
          };
          const allResp = await axios.post(queryUrl, allQuery, { timeout: 4000 });
          if (Array.isArray(allResp.data)) {
            for (const item of allResp.data) {
              if (item.document && item.document.fields) {
                const s = item.document.fields.slug?.stringValue || "";
                if (s === target || s.startsWith(`${target}-`) || target.startsWith(`${s}-`)) {
                  docData = item.document;
                  break;
                }
              }
            }
          }
        } catch {
          // Ignorar
        }
      }

      if (docData && docData.fields) {
        const fields = docData.fields;
        title = fields.title?.stringValue || title;
        description = fields.description?.stringValue || description;
        const firstPage = fields.pageUrls?.arrayValue?.values?.[0]?.stringValue || "";
        coverUrl = fields.coverUrl?.stringValue || firstPage || coverUrl;
        canonicalSlug = fields.slug?.stringValue || target;
      }
    } catch (err: any) {
      console.error("Error fetching magazine in magazine-ssr:", err.message);
    }
  }

  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeCover = escapeHtml(coverUrl);
  const canonicalUrl = `https://zapotlangrafico.com/revista/${encodeURIComponent(canonicalSlug)}`;

  const ogTags = `
    <title>${safeTitle} | Revista Zapotlán Gráfico</title>
    <meta name="description" content="${safeDesc}" />
    <meta property="og:site_name" content="Zapotlán Gráfico" />
    <meta property="og:title" content="${safeTitle} | Revista Zapotlán Gráfico" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:image" content="${safeCover}" />
    <meta property="og:image:secure_url" content="${safeCover}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Portada de ${safeTitle}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle} | Revista Zapotlán Gráfico" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${safeCover}" />
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
    // Reemplazar limpiamente cualquier meta tag previo para evitar duplicados en Facebook Debugger
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
