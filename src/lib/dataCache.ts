import { Article } from '@/types';

interface Flipbook {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  pageUrls: string[];
  slug: string;
  createdAt: any;
  views: number;
  autoPlayDefault?: boolean;
  autoPlayInterval?: number;
  audioUrl?: string;
  autoPlayAudio?: boolean;
  category?: string;
}

export const dataCache = {
  articles: [] as Article[],
  flipbooks: [] as Flipbook[],
  activeFlipbook: null as Flipbook | null,
  hasFetchedArticles: false,
  hasFetchedFlipbooks: false,
};
