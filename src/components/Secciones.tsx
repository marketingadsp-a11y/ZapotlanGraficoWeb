import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, Newspaper, ArrowLeft } from 'lucide-react';
import { useSettings } from '@/lib/SettingsContext';
import { CATEGORY_ICONS } from '@/lib/constants';

interface SeccionesProps {
  currentCategory?: string;
}

export default function Secciones({ currentCategory }: SeccionesProps) {
  const { settings } = useSettings();
  const featured = settings.featuredCategories || [];

  if (!featured || featured.length === 0) return null;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[#00AEEF]/10 flex items-center justify-center text-[#00AEEF]">
            <Newspaper className="h-5 w-5" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Secciones</h2>
        </div>
      </div>

      {currentCategory ? (
        // Special 2-icon view when browsing a category
        <div className="flex flex-wrap gap-4 md:gap-6">
          {/* Icon 1: Go back to main page */}
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.05 }}
            className="group"
          >
            <Link to="/" className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 md:h-18 md:w-18 rounded-[2rem] bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 group-hover:text-[#ED1C24] group-hover:border-[#ED1C24] group-hover:shadow-xl group-hover:shadow-[#ED1C24]/10 transition-all duration-300">
                <ArrowLeft className="h-7 w-7 md:h-8 md:w-8 transition-transform group-hover:-translate-x-1" />
              </div>
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-[#ED1C24] group-hover:text-slate-950 text-center px-1">
                Inicio
              </span>
            </Link>
          </motion.div>

          {/* Icon 2: The current category in selected color state */}
          {(() => {
            const Icon = CATEGORY_ICONS[currentCategory] || Newspaper;
            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                className="group"
              >
                <Link to={`/categoria/${currentCategory}`} className="flex flex-col items-center gap-2 pointer-events-none">
                  <div className="h-16 w-16 md:h-18 md:w-18 rounded-[2rem] bg-[#00AEEF] border border-[#00AEEF] shadow-lg shadow-[#00AEEF]/20 flex items-center justify-center text-white transition-all duration-300">
                    <Icon className="h-7 w-7 md:h-8 md:w-8 animate-pulse" />
                  </div>
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-[#00AEEF] text-center px-1">
                    {currentCategory}
                  </span>
                </Link>
              </motion.div>
            );
          })()}
        </div>
      ) : (
        // Standard full list view
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6">
          {featured.map((category) => {
            const Icon = CATEGORY_ICONS[category] || Newspaper;
            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
                className="group"
              >
                <Link to={`/categoria/${category}`} className="flex flex-col items-center gap-2">
                  <div className="h-16 w-16 md:h-18 md:w-18 rounded-[2rem] bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 group-hover:text-[#00AEEF] group-hover:border-[#00AEEF] group-hover:shadow-xl group-hover:shadow-[#00AEEF]/10 transition-all duration-300">
                    <Icon className="h-7 w-7 md:h-8 md:w-8" />
                  </div>
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-[#00AEEF] group-hover:text-slate-950 text-center px-1">
                    {category}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
      <div className="border-b border-slate-100 pt-4" />
    </section>
  );
}
