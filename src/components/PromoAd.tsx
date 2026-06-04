import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/firebase';
import { Ad } from '@/types';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Megaphone, ExternalLink } from 'lucide-react';

interface PromoAdProps {
  type: 'horizontal' | 'square';
  className?: string;
}

export default function PromoAd({ type, className = "" }: PromoAdProps) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQualifyingAd = async () => {
      try {
        const snap = await getDocs(collection(db, 'ads'));
        const activeAds: Ad[] = [];
        const todayStr = new Date().toISOString().split('T')[0];

        snap.forEach((d) => {
          const data = d.data() as Ad;
          const adItem = { id: d.id, ...data };
          
          // Check if ad is active, not archived, and within date range
          const isStarted = !adItem.startDate || adItem.startDate <= todayStr;
          const isNotExpired = !adItem.endDate || adItem.endDate >= todayStr;
          
          if (
            adItem.isActive && 
            !adItem.isArchived && 
            adItem.type === type && 
            isStarted && 
            isNotExpired
          ) {
            activeAds.push(adItem);
          }
        });

        if (activeAds.length > 0) {
          // Select an ad randomly to rotate public visibility
          const randomIndex = Math.floor(Math.random() * activeAds.length);
          setAd(activeAds[randomIndex]);
        } else {
          setAd(null);
        }
      } catch (error) {
        console.error("Error loading promo ad:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQualifyingAd();
  }, [type]);

  if (loading || !ad) return null;

  // Track click callback
  const handleAdClick = async () => {
    try {
      await updateDoc(doc(db, 'ads', ad.id), {
        clicks: increment(1)
      });
    } catch (error) {
      console.error("Error tracking ad click:", error);
    }
  };

  const isExternal = ad.linkUrl.startsWith('http://') || ad.linkUrl.startsWith('https://') || ad.linkUrl.startsWith('www.');
  const resolvedLink = ad.linkUrl.startsWith('www.') ? `https://${ad.linkUrl}` : ad.linkUrl;

  const contentMarkup = (
    <div className="relative w-full h-full group overflow-hidden bg-slate-900 border border-slate-200/50 rounded-2xl shadow-sm transition-all duration-300">
      <img 
        src={ad.imageUrl} 
        alt={ad.title} 
        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />
      {/* Decorative Badge indicating Publicidad Interna / Patrocinado */}
      <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-[8px] font-black uppercase text-white/95 px-2 py-0.5 rounded-full tracking-wider select-none shrink-0 border border-white/10 z-10">
        Patrocinado
      </span>
      {/* Overlay details on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4 z-10">
        <div className="text-white space-y-0.5 w-full flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider truncate mr-2">{ad.title}</span>
          <ExternalLink className="h-3 w-3 text-white/85 shrink-0" />
        </div>
      </div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative w-full ${type === 'horizontal' ? 'h-24 md:h-28' : 'aspect-square'} ${className}`}
    >
      {isExternal ? (
        <a 
          href={resolvedLink} 
          target="_blank" 
          rel="noopener noreferrer" 
          onClick={handleAdClick}
          className="block w-full h-full cursor-pointer"
        >
          {contentMarkup}
        </a>
      ) : (
        <Link 
          to={ad.linkUrl || '/'} 
          onClick={handleAdClick}
          className="block w-full h-full cursor-pointer"
        >
          {contentMarkup}
        </Link>
      )}
    </motion.div>
  );
}
