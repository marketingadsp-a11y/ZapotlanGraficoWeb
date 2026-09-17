import { collection, getDocs, addDoc, Timestamp, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/firebase";
import { Article } from "@/types";
import { dataCache } from "./dataCache";

export interface FacebookSyncResult {
  success: boolean;
  addedCount: number;
  totalProcessed: number;
  alreadyExistedCount: number;
  error?: string;
}

let syncInProgress = false;
let lastSyncTimestamp = 0;
const MIN_SYNC_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes cooldown

export function isFacebookSyncInProgress(): boolean {
  return syncInProgress;
}

export function getLastFacebookSyncTime(): number {
  return lastSyncTimestamp;
}

/**
 * Creates an article slug from Facebook title/excerpt and postId
 */
export function generateFacebookArticleSlug(title: string, postId: string): string {
  const cleanTitle = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const base = cleanTitle.slice(0, 60) || 'publicacion-facebook';
  const shortId = (postId || Math.random().toString(36).substring(2, 8)).slice(-6);
  return `${base}-fb-${shortId}`;
}

/**
 * Synchronizes recent Facebook posts into Firestore articles.
 * All articles are exclusively categorized with 'Facebook' so they only appear
 * in the dedicated Facebook section.
 */
export async function syncFacebookPostsToArticles(
  facebookUrl: string,
  force: boolean = false,
  accessToken?: string
): Promise<FacebookSyncResult> {
  const targetUrl = facebookUrl || 'https://www.facebook.com/zapotlan.grafico';
  const now = Date.now();

  if (syncInProgress) {
    return { success: false, addedCount: 0, totalProcessed: 0, alreadyExistedCount: 0, error: 'Sync already in progress' };
  }

  if (!force && (now - lastSyncTimestamp < MIN_SYNC_INTERVAL_MS)) {
    return { success: true, addedCount: 0, totalProcessed: 0, alreadyExistedCount: 0 };
  }

  syncInProgress = true;

  try {
    // 1. Call server endpoint to fetch or sync posts
    const response = await fetch('/api/sync-facebook-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl, accessToken })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Error en servidor de Facebook (${response.status})`);
    }

    const data = await response.json();
    const posts: Array<{
      id: string;
      title: string;
      content: string;
      summary?: string;
      imageUrl?: string;
      videoUrl?: string;
      videoAspectRatio?: 'horizontal' | 'vertical';
      permalink?: string;
      published?: string;
    }> = data.posts || [];

    if (posts.length === 0) {
      lastSyncTimestamp = Date.now();
      return {
        success: true,
        addedCount: data.addedCount || 0,
        totalProcessed: 0,
        alreadyExistedCount: 0
      };
    }

    // 2. Fetch existing Facebook articles to prevent duplicate insertions
    const existingSnap = await getDocs(
      query(collection(db, 'articles'), orderBy('createdAt', 'desc'), limit(150))
    );

    const existingPostIds = new Set<string>();
    const existingSlugs = new Set<string>();

    existingSnap.docs.forEach((d) => {
      const art = d.data() as Article;
      if (art.facebookPostId) existingPostIds.add(art.facebookPostId);
      if (art.slug) existingSlugs.add(art.slug.toLowerCase());
    });

    dataCache.articles.forEach((art) => {
      if (art.facebookPostId) existingPostIds.add(art.facebookPostId);
      if (art.slug) existingSlugs.add(art.slug.toLowerCase());
    });

    let addedCount = 0;
    let alreadyExistedCount = 0;

    for (const post of posts) {
      if (existingPostIds.has(post.id)) {
        alreadyExistedCount++;
        continue;
      }

      existingPostIds.add(post.id);

      try {
        const slug = generateFacebookArticleSlug(post.title, post.id);
        const permalink = post.permalink || targetUrl;
        const summary = post.summary || post.content.slice(0, 160);

        const articleContent = `${post.content}

---
[Ver publicación original en Facebook](${permalink})`;

        const newArticleData: Omit<Article, 'id'> = {
          title: post.title.trim(),
          summary,
          content: articleContent,
          imageUrl: post.imageUrl || '',
          videoUrl: post.videoUrl || '',
          videoAspectRatio: post.videoAspectRatio || 'horizontal',
          categories: ['Facebook'], // EXCLUSIVELY Facebook as requested
          subcategories: ['Publicaciones'],
          tags: ['Facebook', 'Zapotlán Gráfico', 'Comunidad'],
          author: 'Facebook - Zapotlán Gráfico',
          createdAt: post.published ? Timestamp.fromDate(new Date(post.published)) : Timestamp.now(),
          views: 0,
          interactions: 0,
          slug,
          facebookPostId: post.id,
          metaDescription: summary.slice(0, 160),
          ogTitle: post.title.trim(),
          ogDescription: summary.slice(0, 160),
          ogImage: post.imageUrl || ''
        };

        const docRef = await addDoc(collection(db, 'articles'), newArticleData);

        dataCache.articles.unshift({
          id: docRef.id,
          ...newArticleData
        } as Article);

        addedCount++;
      } catch (insertErr) {
        console.error(`Error saving Facebook article ${post.id}:`, insertErr);
      }
    }

    lastSyncTimestamp = Date.now();
    return {
      success: true,
      addedCount: addedCount + (data.addedCount || 0),
      totalProcessed: posts.length,
      alreadyExistedCount
    };
  } catch (error: any) {
    console.error('Error in syncFacebookPostsToArticles:', error);
    return {
      success: false,
      addedCount: 0,
      totalProcessed: 0,
      alreadyExistedCount: 0,
      error: error.message || 'Error syncing Facebook posts'
    };
  } finally {
    syncInProgress = false;
  }
}
