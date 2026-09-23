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
    const { slugOrId } = req.query;
    const target = String(slugOrId || '').trim();

    let title = "Revista Digital";
    let description = "Lee la edición interactiva de la revista digital de Zapotlán Gráfico.";
    let coverUrl = DEFAULT_LOGO;
    let canonicalSlug = target || "edicion";

    if (target) {
      try {
        const queryUrl = "https://firestore.googleapis.com/v1/projects/zapotlan-grafico-web/databases/(default)/documents:runQuery";
        
        // 1. Query Firestore REST by slug
        const queryPayload = {
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

        const response = await fetch(queryUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(queryPayload)
        });

        let docData: any = null;
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data[0]?.document) {
            docData = data[0].document;
          }
        }

        // 2. Fallback: by document ID if not found by slug
        if (!docData) {
          try {
            const directUrl = `https://firestore.googleapis.com/v1/projects/zapotlan-grafico-web/databases/(default)/documents/flipbooks/${encodeURIComponent(target)}`;
            const directResp = await fetch(directUrl);
            if (directResp.ok) {
              const directData = await directResp.json();
              if (directData?.fields) {
                docData = directData;
              }
            }
          } catch {}
        }

        if (docData?.fields) {
          const fields = docData.fields;
          title = fields.title?.stringValue || title;
          description = fields.description?.stringValue || description;
          const firstPage = fields.pageUrls?.arrayValue?.values?.[0]?.stringValue || "";
          coverUrl = fields.coverUrl?.stringValue || firstPage || coverUrl;
          canonicalSlug = fields.slug?.stringValue || target;
        }
      } catch (err: any) {
        console.error("Firestore fetch error:", err);
      }
    }

    const safeTitle = escapeHtml(title);
    const safeDesc = escapeHtml(description);
    const safeCover = escapeHtml(coverUrl);
    const canonicalUrl = `https://www.zapotlangrafico.com/revista/${encodeURIComponent(canonicalSlug)}`;

    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
  <meta http-equiv="refresh" content="0; url=${canonicalUrl}" />
</head>
<body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0b0f19; color: #fff;">
  <div style="text-align: center; padding: 20px;">
    <img src="${safeCover}" alt="${safeTitle}" style="max-width: 280px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); margin-bottom: 20px;" />
    <h1 style="font-size: 20px; margin: 0 0 10px 0;">${safeTitle}</h1>
    <p style="font-size: 14px; color: #94a3b8; max-width: 400px; margin: 0 auto 20px auto;">${safeDesc}</p>
    <a href="${canonicalUrl}" style="display: inline-block; background: #00AEEF; color: #fff; padding: 10px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 14px;">Abrir Revista</a>
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
    console.error("Fatal in magazine-ssr:", fatalError);
    const fallbackHtml = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Revista Zapotlán Gráfico</title>
  <meta property="og:title" content="Revista Zapotlán Gráfico" />
  <meta property="og:description" content="Edición digital interactiva de Zapotlán Gráfico." />
  <meta property="og:image" content="${DEFAULT_LOGO}" />
  <meta property="og:type" content="article" />
</head>
<body>
  <p>Cargando revista...</p>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(fallbackHtml);
  }
}
