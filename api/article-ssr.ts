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
  try {
    const { slug } = req.query;
    const target = String(slug || '').trim();

    let title = "Noticias de Zapotlán";
    let description = "Noticias y novedades de Zapotlán y el sur de Jalisco.";
    let imageUrl = DEFAULT_LOGO;
    let canonicalSlug = target;

    if (target) {
      try {
        const url = "https://firestore.googleapis.com/v1/projects/zapotlan-grafico-web/databases/(default)/documents:runQuery";
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
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(query)
        });
        if (response.ok) {
          const results = await response.json();
          if (Array.isArray(results) && results[0]?.document) {
            const docData = results[0].document;
            const fields = docData.fields || {};
            
            title = fields.ogTitle?.stringValue || fields.title?.stringValue || title;
            description = fields.ogDescription?.stringValue || fields.metaDescription?.stringValue || fields.summary?.stringValue || description;
            imageUrl = fields.ogImage?.stringValue || fields.imageUrl?.stringValue || imageUrl;
            canonicalSlug = fields.slug?.stringValue || target;
          }
        }
      } catch (err: any) {
        console.error("Error in article-ssr:", err);
      }
    }

    const safeTitle = escapeHtml(title);
    const safeDesc = escapeHtml(description);
    const safeImg = escapeHtml(imageUrl);
    const canonicalUrl = `https://www.zapotlangrafico.com/nota/${encodeURIComponent(canonicalSlug)}`;

    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
  <meta http-equiv="refresh" content="0; url=${canonicalUrl}" />
</head>
<body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0b0f19; color: #fff;">
  <div style="text-align: center; padding: 20px;">
    <img src="${safeImg}" alt="${safeTitle}" style="max-width: 400px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); margin-bottom: 20px;" />
    <h1 style="font-size: 22px; margin: 0 0 10px 0;">${safeTitle}</h1>
    <p style="font-size: 14px; color: #94a3b8; max-width: 500px; margin: 0 auto 20px auto;">${safeDesc}</p>
    <a href="${canonicalUrl}" style="display: inline-block; background: #00AEEF; color: #fff; padding: 10px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 14px;">Leer Noticia</a>
  </div>
  <script>
    window.location.replace("${canonicalUrl}");
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).send(html);
  } catch (fatalError: any) {
    console.error("Fatal in article-ssr:", fatalError);
    const fallbackHtml = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Zapotlán Gráfico</title>
  <meta property="og:title" content="Zapotlán Gráfico" />
  <meta property="og:description" content="Noticias de Zapotlán y el sur de Jalisco." />
  <meta property="og:image" content="${DEFAULT_LOGO}" />
  <meta property="og:type" content="article" />
</head>
<body>
  <p>Cargando noticia...</p>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(fallbackHtml);
  }
}
