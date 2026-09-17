import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/firebase';
import { SiteSettings, Category } from '@/types';

interface SettingsContextType {
  settings: SiteSettings;
  categories: Category[];
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>({
    logoUrl: '',
    siteName: 'Zapotlán Gráfico'
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubSite = onSnapshot(doc(db, 'config', 'site'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as SiteSettings);
      }
      setLoading(false);
    });

    const unsubCategories = onSnapshot(collection(db, 'categories'), (catSnap) => {
      const list: Category[] = [];
      catSnap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Category);
      });
      setCategories(list);
    });

    return () => {
      unsubSite();
      unsubCategories();
    };
  }, []);

  useEffect(() => {
    if (settings.logoUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = settings.logoUrl;
    }
  }, [settings.logoUrl]);

  return (
    <SettingsContext.Provider value={{ settings, categories, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
