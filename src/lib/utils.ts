import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSafeImageUrl(url: string | undefined) {
  if (!url || url.trim() === '' || url.includes('picsum.photos')) {
    return 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1000&auto=format&fit=crop'; // Better default news image
  }
  
  // If it's a Facebook CDN URL or similar restricted host, use a proxy
  if (url.includes('fbcdn.net') || url.includes('facebook.com') || url.includes('fbsbx.com')) {
    // Using images.weserv.nl as a free image proxy/cache
    // We add &output=jpg to ensure compatibility
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&output=jpg&default=https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1000&auto=format&fit=crop`;
  }
  
  return url;
}
