import { Timestamp } from "firebase/firestore";

export interface Article {
  id: string;
  title: string;
  content: string;
  summary: string;
  imageUrl: string;
  videoUrl?: string;
  categories: string[];
  author: string;
  createdAt: Timestamp;
  views: number;
  interactions: number;
  slug: string;
}

export interface ActivityLog {
  id: string;
  userId: string; // Anonymous or admin
  type: 'view' | 'share' | 'interaction';
  articleId: string;
  timestamp: Timestamp;
}

export interface WeeklyStats {
  totalViews: number;
  totalInteractions: number;
  topArticles: { id: string; title: string; views: number }[];
  activeDays: { date: string; count: number }[];
}

export interface SiteSettings {
  logoUrl: string;
  siteName: string;
  contactEmail?: string;
}
