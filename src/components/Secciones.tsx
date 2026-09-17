import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { useSettings } from '@/lib/SettingsContext';
import { resolveCategoryIcon } from '@/lib/constants';

interface SeccionesProps {
  currentCategory?: string;
}

export default function Secciones({ currentCategory }: SeccionesProps) {
  const { settings, categories } = useSettings();
  const featured = settings.featuredCategories || [];

  if (!featured || featured.length === 0) return null;

  return (
    <section className="space-y-6 w-full min-w-0 overflow-hidden">
      {currentCategory ? (
        // Special 2-icon view when browsing a category
        <div className="flex flex-wrap gap-4 md:gap-6 min-w-0">
          {/* Icon 1: Go back to main page */}
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.05 }}
            className="group shrink-0"
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
            const catDoc = categories.find(
              (c) => c.name.trim().toLowerCase() === currentCategory.trim().toLowerCase()
            );
            const Icon = resolveCategoryIcon(currentCategory, catDoc?.icon);
            const isFb = currentCategory.toLowerCase() === 'facebook';
            const isYt = currentCategory.toLowerCase() === 'videos';
            const activeBg = isFb
              ? 'bg-[#1877F2] border-[#1877F2] shadow-[#1877F2]/25'
              : isYt
              ? 'bg-[#FF0000] border-[#FF0000] shadow-[#FF0000]/25'
              : 'bg-[#00AEEF] border-[#00AEEF] shadow-[#00AEEF]/20';
            const activeText = isFb ? 'text-[#1877F2]' : isYt ? 'text-[#FF0000]' : 'text-[#00AEEF]';
            const targetUrl = catDoc?.customUrl || `/categoria/${currentCategory}`;

            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                className="group shrink-0"
              >
                <Link to={targetUrl} className="flex flex-col items-center gap-2 pointer-events-none">
                  <div
                    className={`h-16 w-16 md:h-18 md:w-18 rounded-[2rem] ${activeBg} border shadow-lg flex items-center justify-center text-white transition-all duration-300`}
                  >
                    <Icon className="h-7 w-7 md:h-8 md:w-8 animate-pulse" />
                  </div>
                  <span
                    className={`text-[10px] md:text-xs font-black uppercase tracking-widest ${activeText} text-center px-1`}
                  >
                    {currentCategory}
                  </span>
                </Link>
              </motion.div>
            );
          })()}
        </div>
      ) : (
        // Standard full list view
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4 md:gap-6 w-full min-w-0">
          {featured.map((category) => {
            const catDoc = categories.find(
              (c) => c.name.trim().toLowerCase() === category.trim().toLowerCase()
            );
            const Icon = resolveCategoryIcon(category, catDoc?.icon);
            const isCatFb = category.toLowerCase() === 'facebook';
            const isCatYt = category.toLowerCase() === 'videos';
            const hoverClass = isCatFb
              ? 'group-hover:text-[#1877F2] group-hover:border-[#1877F2] group-hover:shadow-[#1877F2]/10'
              : isCatYt
              ? 'group-hover:text-[#FF0000] group-hover:border-[#FF0000] group-hover:shadow-[#FF0000]/10'
              : 'group-hover:text-[#00AEEF] group-hover:border-[#00AEEF] group-hover:shadow-[#00AEEF]/10';
            const textHover = isCatFb ? 'text-[#1877F2]' : isCatYt ? 'text-[#FF0000]' : 'text-[#00AEEF]';
            const targetUrl = catDoc?.customUrl || `/categoria/${category}`;

            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
                className="group min-w-0 w-full flex flex-col items-center"
              >
                <Link to={targetUrl} className="flex flex-col items-center gap-2 w-full min-w-0">
                  <div
                    className={`h-16 w-16 md:h-18 md:w-18 rounded-[2rem] bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 ${hoverClass} group-hover:shadow-xl transition-all duration-300 shrink-0`}
                  >
                    <Icon className="h-7 w-7 md:h-8 md:w-8" />
                  </div>
                  <span
                    className={`text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-wider ${textHover} group-hover:text-slate-950 text-center px-1 truncate max-w-full`}
                  >
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
