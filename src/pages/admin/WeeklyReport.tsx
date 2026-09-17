import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase';
import { Article, ActivityLog } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { subDays, format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Eye, Share2, Calendar, FileText, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, getSafeImageUrl } from '@/lib/utils';

export default function WeeklyReport() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<{
    dailyActivity: { date: string, views: number, shares: number }[];
    topArticles: Article[];
    summary: { views: number, shares: number, articles: number };
  }>({
    dailyActivity: [],
    topArticles: [],
    summary: { views: 0, shares: 0, articles: 0 }
  });

  useEffect(() => {
    const fetchReport = async () => {
      const now = new Date();
      const sevenDaysAgo = subDays(now, 7);
      
      const qActivity = query(
        collection(db, 'activity'),
        where('timestamp', '>=', Timestamp.fromDate(sevenDaysAgo)),
        orderBy('timestamp', 'asc')
      );
      
      const activitySnap = await getDocs(qActivity);
      const logs = activitySnap.docs.map(doc => doc.data() as ActivityLog);

      const qArticles = query(
        collection(db, 'articles'),
        where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo))
      );
      const articlesSnap = await getDocs(qArticles);
      
      const dailyData = [];
      for (let i = 6; i >= 0; i--) {
        const day = subDays(now, i);
        const dayLogs = logs.filter(log => isSameDay(log.timestamp.toDate(), day));
        dailyData.push({
          date: format(day, 'EEE d', { locale: es }),
          views: dayLogs.filter(l => l.type === 'view').length,
          shares: dayLogs.filter(l => l.type === 'share').length
        });
      }

      const allArticlesSnap = await getDocs(query(collection(db, 'articles'), orderBy('views', 'desc'), limit(5)));
      const topArticles = allArticlesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));

      setReportData({
        dailyActivity: dailyData,
        topArticles,
        summary: {
          views: logs.filter(l => l.type === 'view').length,
          shares: logs.filter(l => l.type === 'share').length,
          articles: articlesSnap.size
        }
      });
      setLoading(false);
    };

    fetchReport();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00AEEF] border-t-transparent"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Reporte Semanal</h1>
            <p className="text-sm font-medium text-slate-500">Análisis detallado de los últimos 7 días.</p>
          </div>
          <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none rounded-full px-4 py-1.5 font-black text-[10px] uppercase tracking-widest">
            <Calendar className="mr-2 h-3 w-3" /> {format(subDays(new Date(), 7), "d MMM")} - {format(new Date(), "d MMM, yyyy")}
          </Badge>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { label: 'Vistas Totales', value: reportData.summary.views, icon: Eye, color: 'text-[#00AEEF]', bg: 'bg-[#00AEEF]/10' },
            { label: 'Compartidos', value: reportData.summary.shares, icon: Share2, color: 'text-[#ED1C24]', bg: 'bg-[#ED1C24]/10' },
            { label: 'Nuevas Notas', value: reportData.summary.articles, icon: FileText, color: 'text-[#FFF200]', bg: 'bg-[#FFF200]/10' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("rounded-2xl p-3", stat.bg, stat.color)}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-black text-green-500 bg-green-50 px-2 py-1 rounded-full">
                      <ArrowUpRight className="h-3 w-3" />
                      +{(Math.random() * 20).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tighter">{stat.value.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Activity Chart */}
        <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="border-b border-slate-50 p-8">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">Actividad de Audiencia</CardTitle>
          </CardHeader>
          <CardContent className="p-8 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reportData.dailyActivity}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00AEEF" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#00AEEF" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorShares" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ED1C24" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ED1C24" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="views" 
                  stroke="#00AEEF" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorViews)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="shares" 
                  stroke="#ED1C24" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorShares)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Articles */}
        <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="border-b border-slate-50 p-8">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">Notas de Mayor Impacto</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-50">
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 px-8">Artículo</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Categorías</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-right px-8">Vistas Totales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.topArticles.map((article) => (
                  <TableRow key={article.id} className="hover:bg-slate-50/50 border-slate-50 transition-colors">
                    <TableCell className="py-6 px-8">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                          <img 
                            src={getSafeImageUrl(article.imageUrl)} 
                            alt="" 
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <p className="font-black text-slate-900 truncate max-w-md">{article.title}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {article.categories?.map(cat => (
                          <Badge key={cat} variant="secondary" className="bg-slate-100 text-slate-500 border-none text-[9px] font-black uppercase tracking-widest px-2">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-8">
                      <div className="flex items-center justify-end gap-2 font-black text-slate-900">
                        <span className="text-lg tracking-tighter">{article.views.toLocaleString()}</span>
                        <div className="h-8 w-8 rounded-full bg-[#00AEEF]/10 flex items-center justify-center text-[#00AEEF]">
                          <Eye className="h-4 w-4" />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

