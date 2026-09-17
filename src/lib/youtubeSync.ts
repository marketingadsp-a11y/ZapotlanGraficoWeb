import { collection, getDocs, addDoc, Timestamp, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/firebase";
import { Article } from "@/types";
import { dataCache } from "./dataCache";

export interface SyncResult {
  success: boolean;
  addedCount: number;
  totalProcessed: number;
  alreadyExistedCount: number;
  error?: string;
}

let syncInProgress = false;
let lastSyncTimestamp = 0;
const MIN_SYNC_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes cooldown for automatic background sync

/**
 * Extracts the 11-character YouTube video ID from any YouTube URL format.
 */
export function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
}

/**
 * Converts YouTube relative date strings ("hace 2 horas", "hace 3 días", etc.)
 * or standard timestamps into epoch milliseconds.
 */
export function parseYouTubePublishedToMillis(str?: string): number {
  if (!str) return Date.now();
  const trimmed = str.trim();

  // Try standard parse (ISO or RFC dates)
  const parsedDirect = Date.parse(trimmed);
  if (!isNaN(parsedDirect) && parsedDirect > 0) {
    return parsedDirect;
  }

  const lower = trimmed.toLowerCase();
  const now = Date.now();
  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY;
  const YEAR = 365 * DAY;

  const timeMatch = lower.match(/hace\s+(\d+|un|una)?\s*(segundo|minuto|hora|d[íi]a|semana|mes|a[ñn]o)/i);
  if (timeMatch) {
    let num = 1;
    if (timeMatch[1]) {
      const parsedNum = parseInt(timeMatch[1], 10);
      if (!isNaN(parsedNum)) num = parsedNum;
    }
    const unit = timeMatch[2].toLowerCase();
    if (unit.startsWith('seg') || unit.startsWith('min')) return now - num * MINUTE;
    if (unit.startsWith('hor')) return now - num * HOUR;
    if (unit.startsWith('d')) return now - num * DAY;
    if (unit.startsWith('sem')) return now - num * WEEK;
    if (unit.startsWith('mes')) return now - num * MONTH;
    if (unit.startsWith('a')) return now - num * YEAR;
  }

  return now;
}

/**
 * Generates a clean URL slug removing accents and diacritics, appending the videoId
 * for guaranteed uniqueness.
 */
export function generateArticleSlug(title: string, videoId: string): string {
  const cleanTitle = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents (á -> a, ó -> o)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const base = cleanTitle.slice(0, 70) || 'video-reportaje';
  const shortId = videoId.slice(0, 8).toLowerCase();
  return `${base}-${shortId}`;
}

export function isYouTubeSyncInProgress(): boolean {
  return syncInProgress;
}

export function getLastYouTubeSyncTime(): number {
  return lastSyncTimestamp;
}

/**
 * Automatically syncs videos and live streams from the YouTube channel into Firestore articles.
 * - Detects live streams and uploaded videos.
 * - Prevents duplicate articles by tracking YouTube video IDs and video URLs.
 * - Formats rich markdown, summary, tags, and categories ('Noticias' & 'Videos').
 */
export async function syncYouTubeVideosToArticles(
  youtubeUrl: string, 
  force: boolean = false
): Promise<SyncResult> {
  if (!youtubeUrl || !youtubeUrl.trim()) {
    return { success: false, addedCount: 0, totalProcessed: 0, alreadyExistedCount: 0, error: 'No YouTube URL provided' };
  }

  const now = Date.now();
  if (syncInProgress) {
    return { success: false, addedCount: 0, totalProcessed: 0, alreadyExistedCount: 0, error: 'Sync already in progress' };
  }

  if (!force && (now - lastSyncTimestamp < MIN_SYNC_INTERVAL_MS)) {
    return { success: true, addedCount: 0, totalProcessed: 0, alreadyExistedCount: 0 };
  }

  syncInProgress = true;

  try {
    // 1. Fetch channel videos from our server scraping endpoint
    const response = await fetch(`/api/youtube-channel-videos?url=${encodeURIComponent(youtubeUrl.trim())}`);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error en el servidor de YouTube: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const ytVideos: Array<{
      id: string;
      title: string;
      videoUrl: string;
      published: string;
      thumbnail: string;
      isLiveStream?: boolean;
      type?: 'stream' | 'video';
    }> = data.videos || [];

    if (ytVideos.length === 0) {
      lastSyncTimestamp = Date.now();
      return { success: true, addedCount: 0, totalProcessed: 0, alreadyExistedCount: 0 };
    }

    // 2. Fetch existing articles from Firestore to obtain known YouTube video IDs
    const existingSnap = await getDocs(
      query(collection(db, 'articles'), orderBy('createdAt', 'desc'), limit(150))
    );

    const existingVideoIds = new Set<string>();
    const existingSlugs = new Set<string>();

    existingSnap.docs.forEach((d) => {
      const art = d.data() as Article;
      if (art.slug) existingSlugs.add(art.slug.toLowerCase());
      if (art.youtubeVideoId) existingVideoIds.add(art.youtubeVideoId);
      if (art.videoUrl) {
        const idFromUrl = extractYouTubeId(art.videoUrl);
        if (idFromUrl) existingVideoIds.add(idFromUrl);
      }
    });

    // Also check local cache
    dataCache.articles.forEach((art) => {
      if (art.slug) existingSlugs.add(art.slug.toLowerCase());
      if (art.youtubeVideoId) existingVideoIds.add(art.youtubeVideoId);
      if (art.videoUrl) {
        const idFromUrl = extractYouTubeId(art.videoUrl);
        if (idFromUrl) existingVideoIds.add(idFromUrl);
      }
    });

    let addedCount = 0;
    let alreadyExistedCount = 0;

    // 3. Filter items that need to be published as articles
    const toCreate: typeof ytVideos = [];
    for (const v of ytVideos) {
      if (existingVideoIds.has(v.id)) {
        alreadyExistedCount++;
      } else {
        toCreate.push(v);
        existingVideoIds.add(v.id); // Guard against duplicates inside the same batch
      }
    }

    // 4. Save new articles to Firestore sequentially
    for (const video of toCreate) {
      try {
        const isLive = Boolean(video.isLiveStream);
        const publishMillis = parseYouTubePublishedToMillis(video.published);
        const slug = generateArticleSlug(video.title, video.id);

        const summary = isLive
          ? `🔴 Transmisión en vivo de Zapotlán Gráfico: ${video.title}`
          : `Video reportaje y cobertura informativa de Zapotlán Gráfico: ${video.title}`;

        const content = `${isLive ? '🔴 **Transmisión especial en vivo emitida por Zapotlán Gráfico.**' : '**Reportaje especial y cobertura informativa en video de Zapotlán Gráfico.**'}

Te compartimos la cobertura audiovisual de este acontecimiento ocurrido en Zapotlán el Grande y municipios del sur de Jalisco.

Mantente informado a través de nuestras plataformas con las noticias más destacadas, coberturas en tiempo real y reportajes de la comunidad.

[Ver en el canal oficial de YouTube de Zapotlán Gráfico](${video.videoUrl})`;

        const newArticleData: Omit<Article, 'id'> = {
          title: video.title.trim(),
          summary,
          content,
          imageUrl: video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
          videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
          videoAspectRatio: 'horizontal',
          categories: ['Noticias', 'Videos'],
          subcategories: [isLive ? 'En vivo' : 'Reportajes'],
          tags: ['Zapotlán Gráfico', 'Noticias', isLive ? 'En Vivo' : 'Video', 'Jalisco'],
          author: 'Redacción Zapotlán Gráfico',
          createdAt: Timestamp.fromMillis(publishMillis),
          views: 0,
          interactions: 0,
          slug,
          youtubeVideoId: video.id,
          isLiveStream: isLive,
          metaDescription: summary.slice(0, 160),
          ogTitle: video.title.trim(),
          ogDescription: summary.slice(0, 160),
          ogImage: video.thumbnail
        };

        const docRef = await addDoc(collection(db, 'articles'), newArticleData);
        
        // Add to local cache so current view reflects it right away
        dataCache.articles.unshift({
          id: docRef.id,
          ...newArticleData
        } as Article);

        addedCount++;
      } catch (insertErr) {
        console.error(`Error saving YouTube article ${video.id}:`, insertErr);
      }
    }

    lastSyncTimestamp = Date.now();
    return {
      success: true,
      addedCount,
      totalProcessed: ytVideos.length,
      alreadyExistedCount
    };
  } catch (error: any) {
    console.error('Error in syncYouTubeVideosToArticles:', error);
    return {
      success: false,
      addedCount: 0,
      totalProcessed: 0,
      alreadyExistedCount: 0,
      error: error.message || 'Error syncing YouTube videos'
    };
  } finally {
    syncInProgress = false;
  }
}
