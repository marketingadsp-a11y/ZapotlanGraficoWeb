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
  subcategories?: string[];
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
  featuredCategories?: string[];
}

export interface Subscriber {
  id: string;
  name: string;
  phoneNumber: string;
  createdAt: Timestamp;
}

export interface Category {
  id: string; // URL slugs/name id
  name: string;
  description?: string;
  subcategories?: string[];
  createdAt?: Timestamp;
}

export interface Ad {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  type: 'horizontal' | 'square';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isActive: boolean;
  isArchived: boolean;
  clicks: number;
  createdAt: Timestamp;
}

