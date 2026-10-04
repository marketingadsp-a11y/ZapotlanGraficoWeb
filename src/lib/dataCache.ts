import { Article, Flipbook } from '@/types';

export const dataCache = {
  articles: [] as Article[],
  flipbooks: [] as Flipbook[],
  activeFlipbook: null as Flipbook | null,
  hasFetchedArticles: false,
  hasFetchedFlipbooks: false,
};
