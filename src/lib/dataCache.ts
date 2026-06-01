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
}

export const dataCache = {
  articles: [] as Article[],
  flipbooks: [] as Flipbook[],
  hasFetchedArticles: false,
  hasFetchedFlipbooks: false,
};
