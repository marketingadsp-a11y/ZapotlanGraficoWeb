import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { Article, ActivityLog } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, MessageCircle, FileText, TrendingUp, Clock, ArrowUpRight, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalArticles: 0,
    totalViews: 0,
    totalInteractions: 0
  });
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);

  useEffect(() => {
    // Fetch total stats
    const fetchStats = async () => {
      const articlesSnap = await getDocs(collection(db, 'articles'));
      let views = 0;
      let interactions = 0;
      articlesSnap.forEach(doc => {
        views += doc.data().views || 0;
        interactions += doc.data().interactions || 0;
      });
      setStats({
        totalArticles: articlesSnap.size,
        totalViews: views,
        totalInteractions: interactions
      });
    };

    fetchStats();

    // Listen for recent articles
    const qArticles = query(collection(db, 'articles'), orderBy('createdAt', 'desc'), limit(5));
    const unsubArticles = onSnapshot(qArticles, (snap) => {
      setRecentArticles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article)));
    });

    // Listen for recent activity
    const qActivity = query(collection(db, 'activity'), orderBy('timestamp', 'desc'), limit(10));
    const unsubActivity = onSnapshot(qActivity, (snap) => {
      setRecentActivity(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog)));
    });

    return () => {
      unsubArticles();
      unsubActivity();
    };
  }, []);

  const statCards = [
    { label: 'Artículos', value: stats.totalArticles, icon: FileText, color: 'text-[#00AEEF]', bg: 'bg-[#00AEEF]/10' },
    { label: 'Vistas', value: stats.totalViews.toLocaleString(), icon: Eye, color: 'text-[#ED1C24]', bg: 'bg-[#ED1C24]/10' },
    { label: 'Interacciones', value: stats.totalInteractions, icon: MessageCircle, color: 'text-[#FFF200]', bg: 'bg-[#FFF200]/10' },
    { label: 'Usuarios', value: '1,240', icon: Users, color: 'text-slate-600', bg: 'bg-slate-100' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Dashboard</h1>
          <p className="text-sm font-medium text-slate-500">Resumen general del rendimiento de tu sitio.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-none shadow-sm bg-white overflow-hidden group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("rounded-2xl p-3 transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-black text-green-500 bg-green-50 px-2 py-1 rounded-full">
                      <ArrowUpRight className="h-3 w-3" />
                      12%
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Recent Articles */}
          <Card className="border-none shadow-sm bg-white rounded-[2rem]">
            <CardHeader className="border-b border-slate-50 pb-4">
              <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-900">
                <Clock className="h-4 w-4 text-[#ED1C24]" />
                Últimas Publicaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {recentArticles.map((article) => (
                  <div key={article.id} className="flex items-center justify-between group">
                    <div className="space-y-1">
                      <p className="font-black text-slate-900 leading-none group-hover:text-[#00AEEF] transition-colors cursor-pointer">{article.title}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {format(article.createdAt.toDate(), "d MMM, HH:mm", { locale: es })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-black text-slate-400">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3 text-[#00AEEF]" /> {article.views}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3 text-[#ED1C24]" /> {article.interactions}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-none shadow-sm bg-white rounded-[2rem]">
            <CardHeader className="border-b border-slate-50 pb-4">
              <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-900">
                <TrendingUp className="h-4 w-4 text-[#00AEEF]" />
                Actividad en Tiempo Real
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {recentActivity.map((log) => (
                  <div key={log.id} className="flex items-center gap-4 text-sm">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                      log.type === 'view' ? 'bg-green-50 text-green-500' : log.type === 'share' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'
                    )}>
                      {log.type === 'view' ? <Eye className="h-5 w-5" /> : log.type === 'share' ? <TrendingUp className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">
                        {log.type === 'view' ? 'Nueva Vista' : log.type === 'share' ? 'Compartido' : 'Interacción'}
                      </p>
                      <p className="text-[10px] font-medium text-slate-400 truncate">Artículo ID: {log.articleId}</p>
                    </div>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      {format(log.timestamp.toDate(), "HH:mm", { locale: es })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

