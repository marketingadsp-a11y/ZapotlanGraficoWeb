import { Timestamp } from "firebase/firestore";

export interface Article {
  id: string;
  title: string;
  content: string;
  summary: string;
  imageUrl: string;
  videoUrl?: string;
  videoAspectRatio?: 'vertical' | 'horizontal';
  categories: string[];
  tags?: string[];
  author: string;
  createdAt: Timestamp;
  views: number;
  interactions: number;
  slug: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
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
  showAuthor?: boolean;
  imgbbApiKey?: string;
  subscriptionModalEnabled?: boolean;
  subscriptionModalDelaySeconds?: number;
  subscriptionModalTitle?: string;
  subscriptionModalDescription?: string;
  subscriptionModalTriggerType?: 'session' | 'timer' | 'always';
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
}

export interface Subscriber {
  id: string;
  name: string;
  phoneNumber: string;
  createdAt: Timestamp;
}
