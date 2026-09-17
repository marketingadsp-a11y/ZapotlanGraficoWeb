import axios from "axios";

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe') {
      return res.status(200).send(challenge);
    }
    return res.json({
      status: "online",
      message: "Facebook Webhook endpoint active."
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    let incomingItems: any[] = [];

    if (body.entry && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        if (entry.changes && Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            if (change.field === 'feed' && change.value) {
              const val = change.value;
              if (val.verb === 'add' || !val.verb) {
                incomingItems.push({
                  id: val.post_id || val.id || `${entry.id}_${Date.now()}`,
                  message: val.message || val.description || '',
                  link: val.link || val.permalink_url || 'https://www.facebook.com/zapotlan.grafico',
                  photos: val.photos || (val.photo ? [val.photo] : []),
                  videoUrl: val.video || (val.item === 'video' ? val.link : '')
                });
              }
            }
          }
        }
      }
    } else if (body.id || body.message || body.text || body.content) {
      incomingItems.push({
        id: String(body.id || body.postId || Date.now()),
        message: body.message || body.text || body.content || body.title || '',
        title: body.title,
        link: body.link || body.url || body.permalink || 'https://www.facebook.com/zapotlan.grafico',
        photos: body.photos || (body.imageUrl || body.image ? [body.imageUrl || body.image] : []),
        videoUrl: body.videoUrl || body.video || '',
        published: body.published || body.created_time
      });
    }

    if (incomingItems.length === 0) {
      return res.json({ success: true, message: "No actionable post items found in payload" });
    }

    let createdCount = 0;
    for (const item of incomingItems) {
      const postId = item.id;
      let rawText = (item.message || '').trim();
      let title = item.title;
      if (!title || title.length < 5) {
        const firstLine = rawText.split('\n')[0].replace(/[#*]/g, '').trim();
        title = firstLine.length > 5 && firstLine.length < 120 
          ? firstLine 
          : `Publicación de Facebook: ${firstLine.slice(0, 80) || 'Actualización de Zapotlán Gráfico'}`;
      }

      const clean = title
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const base = clean.slice(0, 60) || 'publicacion-facebook';
      const shortId = (postId || Math.random().toString(36).substring(2, 8)).slice(-6);
      const slug = `${base}-fb-${shortId}`;

      const summary = rawText.slice(0, 160).replace(/\n/g, ' ') || 'Publicación oficial compartida en Facebook por Zapotlán Gráfico.';
      const imageUrl = item.photos?.[0] || '';
      const permalink = item.link || 'https://www.facebook.com/zapotlan.grafico';

      const content = `${rawText}

---
[Ver publicación original en Facebook](${permalink})`;

      const url = `https://firestore.googleapis.com/v1/projects/zapotlan-grafico-web/databases/(default)/documents/articles`;
      const fields: any = {
        title: { stringValue: title },
        summary: { stringValue: summary },
        content: { stringValue: content },
        categories: { arrayValue: { values: [{ stringValue: 'Facebook' }] } },
        subcategories: { arrayValue: { values: [{ stringValue: 'Publicaciones' }] } },
        tags: { arrayValue: { values: [{ stringValue: 'Facebook' }, { stringValue: 'Zapotlán Gráfico' }] } },
        author: { stringValue: 'Facebook - Zapotlán Gráfico' },
        createdAt: { timestampValue: item.published ? new Date(item.published).toISOString() : new Date().toISOString() },
        views: { integerValue: '0' },
        interactions: { integerValue: '0' },
        slug: { stringValue: slug },
        facebookPostId: { stringValue: postId }
      };

      if (imageUrl) fields.imageUrl = { stringValue: imageUrl };
      if (item.videoUrl) fields.videoUrl = { stringValue: item.videoUrl };

      await axios.post(url, { fields });
      createdCount++;
    }

    res.json({ success: true, createdCount });
  } catch (err: any) {
    console.error("Vercel webhook error:", err.message);
    res.status(500).json({ error: "Failed to process Facebook webhook", details: err.message });
  }
}
