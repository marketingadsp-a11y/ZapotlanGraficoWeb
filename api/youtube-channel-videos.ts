import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: "YouTube URL is required" });
  }

  try {
    let rawUrl = url.trim();
    
    // Decode first to prevent potential double encodings (e.g., %C3%A1 -> á)
    try {
      rawUrl = decodeURIComponent(rawUrl);
    } catch (e) {
      // Fallback if decoding fails
    }

    let targetUrl = rawUrl;
    
    // Support patterns like: "@ZapotlanGraficoMX", "ZapotlanGraficoMX", and full custom URLs
    if (targetUrl.startsWith('@')) {
      targetUrl = 'https://www.youtube.com/' + targetUrl;
    } else if (!targetUrl.toLowerCase().includes('youtube.com') && !targetUrl.toLowerCase().includes('youtu.be')) {
      targetUrl = 'https://www.youtube.com/@' + targetUrl;
    } else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    const cleanUrl = targetUrl.replace(/\/+$/, '').replace(/\/(videos|streams)$/, '');
    const videosUrl = `${cleanUrl}/videos`;
    const streamsUrl = `${cleanUrl}/streams`;

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    };

    const parseRelativeDate = (str: string): number => {
      if (!str) return 0;
      const lower = str.toLowerCase();
      const timestamp = Date.parse(str);
      if (!isNaN(timestamp)) return timestamp;

      const now = Date.now();
      const MINUTE = 60 * 1000;
      const HOUR = 60 * MINUTE;
      const DAY = 24 * HOUR;
      const WEEK = 7 * DAY;
      const MONTH = 30 * DAY;
      const YEAR = 365 * DAY;

      const timeMatch = lower.match(/(?:hace|hace\s+un|hace\s+una)?\s*(\d+)?\s*(segundo|minuto|hora|d[íi]a|semana|mes|a[ñn]o)/);
      let num = 1;
      let unit = "";
      if (timeMatch) {
        if (timeMatch[1]) num = parseInt(timeMatch[1], 10);
        unit = timeMatch[2];
      } else {
        const fallbackNum = lower.match(/hace\s+(\d+)/);
        if (fallbackNum) num = parseInt(fallbackNum[1], 10);
      }

      if (unit.startsWith("seg") || unit.startsWith("min")) return now - num * MINUTE;
      if (unit.startsWith("hor")) return now - num * HOUR;
      if (unit.startsWith("d")) return now - num * DAY;
      if (unit.startsWith("sem")) return now - num * WEEK;
      if (unit.startsWith("mes")) return now - num * MONTH;
      if (unit.startsWith("a")) return now - num * YEAR;

      return now - 100 * DAY;
    };

    const parseVideosFromHtml = (html: string, isStreamDefault = false) => {
      const videos: any[] = [];
      const seenIds = new Set<string>();
      let channelId: string | null = null;

      const match = html.match(/var ytInitialData = ({.*?});<\/script>/s) || html.match(/ytInitialData\s*=\s*({.+?});/s);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          channelId = data.metadata?.channelMetadataRenderer?.externalId || null;

          const traverse = (node: any) => {
            if (!node || typeof node !== "object") return;

            // Modern YouTube format (lockupViewModel)
            if (node.lockupViewModel && node.lockupViewModel.contentId) {
              const lvm = node.lockupViewModel;
              const id = lvm.contentId;
              if (!seenIds.has(id)) {
                seenIds.add(id);
                const title = lvm.metadata?.lockupMetadataViewModel?.title?.content ||
                              lvm.rendererContext?.accessibilityContext?.label || "";
                const metaParts = lvm.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts || [];
                const published = metaParts.map((p: any) => p.text?.content).filter(Boolean).join(" • ") || "";
                const isLive = published.toLowerCase().includes("transmitido") || published.toLowerCase().includes("en vivo") || isStreamDefault;
                const thumbSources = lvm.contentImage?.thumbnailViewModel?.image?.sources || [];
                const thumbnail = thumbSources[thumbSources.length - 1]?.url || `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
                videos.push({
                  id,
                  title,
                  videoUrl: `https://www.youtube.com/watch?v=${id}`,
                  published,
                  thumbnail,
                  isLiveStream: isLive,
                  type: isLive ? "stream" : "video"
                });
              }
            }

            // Classic YouTube format (videoRenderer)
            if (node.videoRenderer && node.videoRenderer.videoId) {
              const vr = node.videoRenderer;
              const id = vr.videoId;
              if (!seenIds.has(id)) {
                seenIds.add(id);
                const title = vr.title?.runs?.map((r: any) => r.text).join("") || vr.title?.simpleText || "";
                const published = vr.publishedTimeText?.simpleText || "";
                const isLive = published.toLowerCase().includes("transmitido") || isStreamDefault;
                const thumbSources = vr.thumbnail?.thumbnails || [];
                const thumbnail = thumbSources[thumbSources.length - 1]?.url || `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
                videos.push({
                  id,
                  title,
                  videoUrl: `https://www.youtube.com/watch?v=${id}`,
                  published,
                  thumbnail,
                  isLiveStream: isLive,
                  type: isLive ? "stream" : "video"
                });
              }
            }

            for (const key of Object.keys(node)) {
              traverse(node[key]);
            }
          };

          traverse(data);
        } catch (e: any) {
          console.warn("ytInitialData parse error:", e.message);
        }
      }

      if (!channelId) {
        const idMatch = html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
        if (idMatch) {
          channelId = idMatch[1];
        } else {
          const cMatch = html.match(/channel\/(UC[a-zA-Z0-9_-]{22})/);
          if (cMatch) channelId = cMatch[1];
        }
      }

      return { channelId, videos };
    };

    let videos: any[] = [];
    let channelId: string | null = null;
    const seenIds = new Set<string>();

    // Fetch both /videos and /streams in parallel for complete coverage
    const [videosRes, streamsRes] = await Promise.allSettled([
      axios.get(encodeURI(videosUrl), { headers, timeout: 10000 }),
      axios.get(encodeURI(streamsUrl), { headers, timeout: 10000 })
    ]);

    if (streamsRes.status === "fulfilled") {
      const parsed = parseVideosFromHtml(streamsRes.value.data, true);
      if (parsed.channelId) channelId = parsed.channelId;
      for (const v of parsed.videos) {
        if (!seenIds.has(v.id)) {
          seenIds.add(v.id);
          videos.push(v);
        }
      }
    }

    if (videosRes.status === "fulfilled") {
      const parsed = parseVideosFromHtml(videosRes.value.data, false);
      if (parsed.channelId && !channelId) channelId = parsed.channelId;
      for (const v of parsed.videos) {
        if (!seenIds.has(v.id)) {
          seenIds.add(v.id);
          videos.push(v);
        }
      }
    }

    // Sort all videos chronologically (newest first)
    if (videos.length > 0) {
      videos.sort((a, b) => parseRelativeDate(b.published) - parseRelativeDate(a.published));
    }

    // 2. Fallback attempt: fetch channel root if 0 videos
    if (videos.length === 0) {
      try {
        const homeRes = await axios.get(encodeURI(cleanUrl), { headers, timeout: 10000 });
        const parsed = parseVideosFromHtml(homeRes.data);
        if (!channelId) channelId = parsed.channelId;
        if (parsed.videos.length > 0) videos = parsed.videos;
      } catch (err: any) {
        console.warn("YouTube channel root scrape failed:", err.message);
      }
    }

    // 3. Fallback attempt: RSS Feed if still 0 videos
    if (videos.length === 0 && channelId) {
      try {
        const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        const feedRes = await axios.get(encodeURI(feedUrl), { headers, timeout: 6000 });
        const $feed = cheerio.load(feedRes.data, { xmlMode: true });

        $feed('entry').each((_, entry) => {
          const $entry = $feed(entry);
          let videoId = $entry.find('yt\\:videoId').text() || $entry.find('videoId').text();
          if (!videoId) {
            const idText = $entry.find('id').text() || '';
            const match = idText.match(/yt:video:(.+)/);
            if (match) videoId = match[1];
          }
          const title = $entry.find('title').text();
          const link = $entry.find('link').attr('href') || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : '');
          const published = $entry.find('published').text();
          let thumbnail = $entry.find('media\\:group media\\:thumbnail, group thumbnail').attr('url') ||
                          (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '');

          if (videoId && !seenIds.has(videoId)) {
            seenIds.add(videoId);
            videos.push({
              id: videoId,
              title,
              videoUrl: link,
              published,
              thumbnail,
              isLiveStream: false,
              type: "video"
            });
          }
        });
      } catch (feedErr: any) {
        console.warn("YouTube RSS feed fallback also failed:", feedErr.message);
      }
    }

    // 4. Default fallback channel ID for Zapotlán Gráfico if still missing
    const normalizedLower = targetUrl.toLowerCase();
    if (!channelId && (normalizedLower.includes("zapotlan") || normalizedLower.includes("zapotlán"))) {
      channelId = "UC6xwxt0tXYDUs3WTClcQO3w";
    }

    if (!channelId && videos.length === 0) {
      return res.status(404).json({ error: "Could not find a YouTube Channel or videos for the provided URL." });
    }

    res.status(200).json({
      channelId: channelId || "UC6xwxt0tXYDUs3WTClcQO3w",
      videos
    });
  } catch (err: any) {
    console.error("YouTube parse error:", err.message);
    res.status(500).json({ error: "Failed to fetch YouTube channel videos", details: err.message });
  }
}
