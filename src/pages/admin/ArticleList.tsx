import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Article } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Edit, 
  Trash2, 
  Eye, 
  ExternalLink, 
  Plus, 
  Search, 
  Filter, 
  MessageCircle, 
  Youtube, 
  RefreshCw, 
  Facebook, 
  X, 
  Loader2,
  Calendar,
  ArrowUpDown,
  Tag,
  RotateCcw,
  FolderOpen
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { getSafeImageUrl, cn } from '@/lib/utils';
import { useSettings } from '@/lib/SettingsContext';
import { syncYouTubeVideosToArticles } from '@/lib/youtubeSync';
import { syncFacebookPostsToArticles, generateFacebookArticleSlug } from '@/lib/facebookSync';
import { AnimatePresence, motion } from 'motion/react';

export default function ArticleList() {
  const { settings, categories } = useSettings();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'last7days' | 'thisMonth' | 'lastMonth' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'date_desc' | 'date_asc' | 'views_desc' | 'interactions_desc' | 'title_asc'>('date_desc');
  const [formatFilter, setFormatFilter] = useState<'all' | 'youtube' | 'facebook' | 'standard'>('all');

  const [syncingYt, setSyncingYt] = useState(false);
  const [syncingFb, setSyncingFb] = useState(false);
  const [showFbImportModal, setShowFbImportModal] = useState(false);
  const [fbPostUrl, setFbPostUrl] = useState('');
  const [importingFbPost, setImportingFbPost] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setArticles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSyncYouTube = async () => {
    const ytUrl = settings.youtubeUrl || 'https://www.youtube.com/@ZapotlánGraficoMX';
    setSyncingYt(true);
    const toastId = toast.loading('Sincronizando videos y transmisiones de YouTube...');
    try {
      const result = await syncYouTubeVideosToArticles(ytUrl, true);
      if (result.success) {
        if (result.addedCount > 0) {
          toast.success(`¡Sincronización exitosa! Se ${result.addedCount === 1 ? 'agregó 1 nuevo artículo' : `agregaron ${result.addedCount} nuevos artículos`}.`, { id: toastId });
        } else {
          toast.info(`Canal al día (${result.totalProcessed} videos verificados, 0 nuevos).`, { id: toastId });
        }
      } else {
        toast.error(result.error || 'Error al sincronizar con YouTube', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || 'Error inesperado', { id: toastId });
    } finally {
      setSyncingYt(false);
    }
  };

  const handleSyncFacebook = async () => {
    const fbUrl = settings.facebookUrl || 'https://www.facebook.com/zapotlan.grafico';
    setSyncingFb(true);
    const toastId = toast.loading('Sincronizando publicaciones de Facebook...');
    try {
      const result = await syncFacebookPostsToArticles(fbUrl, true, settings.facebookPageAccessToken);
      if (result.success) {
        if (result.addedCount > 0) {
          toast.success(`¡Sincronización exitosa! Se ${result.addedCount === 1 ? 'creó 1 nuevo artículo en Facebook' : `crearon ${result.addedCount} nuevos artículos en Facebook`}.`, { id: toastId });
        } else {
          toast.info(`Sección Facebook al día (sin nuevas publicaciones).`, { id: toastId });
        }
      } else {
        toast.error(result.error || 'Error al sincronizar con Facebook', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || 'Error inesperado al sincronizar', { id: toastId });
    } finally {
      setSyncingFb(false);
    }
  };

  const handleImportSingleFacebookPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbPostUrl.trim()) {
      toast.error('Por favor ingresa el enlace de la publicación de Facebook');
      return;
    }
    setImportingFbPost(true);
    const toastId = toast.loading('Extrayendo publicación de Facebook con IA...');
    try {
      const res = await fetch('/api/scrape-facebook-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fbPostUrl.trim() })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'No se pudo leer la publicación de Facebook.');
      }
      const data = await res.json();
      const hashId = Math.random().toString(36).substring(2, 8);
      const title = (data.title || 'Publicación de Facebook').trim();
      const slug = generateFacebookArticleSlug(title, hashId);
      const permalink = fbPostUrl.trim();

      const newArticleData: Omit<Article, 'id'> = {
        title,
        summary: data.summary || (data.content ? data.content.slice(0, 160) : 'Publicación de Facebook'),
        content: `${data.content || ''}\n\n---\n[Ver publicación original en Facebook](${permalink})`,
        imageUrl: data.imageUrl || '',
        videoUrl: data.videoUrl || '',
        videoAspectRatio: 'horizontal',
        categories: ['Facebook'], // EXCLUSIVELY Facebook
        subcategories: ['Publicaciones'],
        tags: Array.isArray(data.tags) && data.tags.length > 0 ? data.tags : ['Facebook', 'Zapotlán Gráfico'],
        author: 'Facebook - Zapotlán Gráfico',
        createdAt: Timestamp.now(),
        views: 0,
        interactions: 0,
        slug,
        facebookPostId: hashId,
        metaDescription: data.summary ? data.summary.slice(0, 160) : title,
        ogTitle: title,
        ogDescription: data.summary ? data.summary.slice(0, 160) : title,
        ogImage: data.imageUrl || ''
      };

      await addDoc(collection(db, 'articles'), newArticleData);
      toast.success('¡Publicación de Facebook agregada exitosamente a la sección Facebook!', { id: toastId });
      setShowFbImportModal(false);
      setFbPostUrl('');
    } catch (err: any) {
      console.error("Error importing FB post:", err);
      toast.error(`Error: ${err.message || 'No se pudo importar la publicación'}`, { id: toastId });
    } finally {
      setImportingFbPost(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Using a simple confirm for now, but styled better in the future
    if (window.confirm('¿Estás seguro de eliminar esta nota?')) {
      try {
        await deleteDoc(doc(db, 'articles', id));
        toast.success('Nota eliminada correctamente');
      } catch (error) {
        toast.error('Error al eliminar la nota');
      }
    }
  };

  // Helper for safe dates
  const getArticleDate = (art: Article): Date => {
    if (!art.createdAt) return new Date(0);
    if (typeof (art.createdAt as any).toDate === 'function') {
      return (art.createdAt as any).toDate();
    }
    if ((art.createdAt as any).seconds) {
      return new Date((art.createdAt as any).seconds * 1000);
    }
    const d = new Date(art.createdAt as any);
    return isNaN(d.getTime()) ? new Date(0) : d;
  };

  // Collect all unique categories from settings and articles
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    categories.forEach(c => c.name && set.add(c.name.trim()));
    articles.forEach(art => {
      if (Array.isArray(art.categories)) {
        art.categories.forEach(c => c && set.add(c.trim()));
      } else if (typeof art.categories === 'string' && art.categories) {
        (art.categories as string).split(',').forEach(c => c && set.add(c.trim()));
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [categories, articles]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let uncat = 0;
    articles.forEach(art => {
      let hasCat = false;
      if (Array.isArray(art.categories) && art.categories.length > 0) {
        art.categories.forEach(c => {
          if (c) {
            const k = c.trim().toLowerCase();
            counts[k] = (counts[k] || 0) + 1;
            hasCat = true;
          }
        });
      } else if (typeof art.categories === 'string' && art.categories) {
        (art.categories as string).split(',').forEach(c => {
          if (c) {
            const k = c.trim().toLowerCase();
            counts[k] = (counts[k] || 0) + 1;
            hasCat = true;
          }
        });
      }
      if (!hasCat) uncat++;
    });
    return { counts, uncat };
  }, [articles]);

  // Comprehensive filtered and sorted articles
  const filteredArticles = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    return articles.filter(article => {
      // 1. Text search (title, author, tags)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = (article.title || '').toLowerCase().includes(q);
        const matchAuthor = (article.author || '').toLowerCase().includes(q);
        const matchTags = Array.isArray(article.tags) && article.tags.some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchAuthor && !matchTags) return false;
      }

      // 2. Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === '__uncategorized__') {
          const isUncat = !article.categories || 
            article.categories.length === 0 || 
            (Array.isArray(article.categories) && article.categories.every(c => !c || c.toLowerCase() === 'general' || c.toLowerCase() === 'sin categoría'));
          if (!isUncat) return false;
        } else {
          const target = selectedCategory.toLowerCase();
          let matches = false;
          if (Array.isArray(article.categories)) {
            matches = article.categories.some(c => typeof c === 'string' && c.trim().toLowerCase() === target);
          } else if (typeof article.categories === 'string') {
            matches = (article.categories as string).split(',').some(c => c.trim().toLowerCase() === target);
          }
          if (!matches) return false;
        }
      }

      // 3. Format filter
      if (formatFilter !== 'all') {
        const isFb = Boolean(article.facebookPostId || (article.categories && article.categories.includes('Facebook')));
        const isYt = Boolean(article.youtubeVideoId || article.videoUrl || (article.categories && article.categories.includes('Videos')));
        if (formatFilter === 'facebook' && !isFb) return false;
        if (formatFilter === 'youtube' && !isYt) return false;
        if (formatFilter === 'standard' && (isFb || isYt)) return false;
      }

      // 4. Date filter
      const artDate = getArticleDate(article);
      if (dateFilter === 'today') {
        if (artDate < startOfToday) return false;
      } else if (dateFilter === 'last7days') {
        if (artDate < sevenDaysAgo) return false;
      } else if (dateFilter === 'thisMonth') {
        if (artDate < startOfThisMonth) return false;
      } else if (dateFilter === 'lastMonth') {
        if (artDate < startOfLastMonth || artDate > endOfLastMonth) return false;
      } else if (dateFilter === 'custom') {
        if (customStartDate) {
          const start = new Date(customStartDate + 'T00:00:00');
          if (artDate < start) return false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate + 'T23:59:59');
          if (artDate > end) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // 5. Sorting
      if (sortOrder === 'date_asc') {
        return getArticleDate(a).getTime() - getArticleDate(b).getTime();
      }
      if (sortOrder === 'views_desc') {
        return (b.views || 0) - (a.views || 0);
      }
      if (sortOrder === 'interactions_desc') {
        return (b.interactions || 0) - (a.interactions || 0);
      }
      if (sortOrder === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '', 'es');
      }
      // Default: date_desc
      return getArticleDate(b).getTime() - getArticleDate(a).getTime();
    });
  }, [articles, searchTerm, selectedCategory, formatFilter, dateFilter, customStartDate, customEndDate, sortOrder]);

  const hasActiveFilters = 
    searchTerm !== '' || 
    selectedCategory !== 'all' || 
    dateFilter !== 'all' || 
    formatFilter !== 'all' || 
    sortOrder !== 'date_desc' || 
    customStartDate !== '' || 
    customEndDate !== '';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setDateFilter('all');
    setFormatFilter('all');
    setSortOrder('date_desc');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight uppercase text-slate-900">Artículos</h1>
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border-slate-200">
                {articles.length} notas
              </Badge>
            </div>
            <p className="text-xs font-medium text-slate-500">Gestiona, busca y filtra tus publicaciones.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button 
              variant="outline" 
              onClick={() => setShowFbImportModal(true)}
              className="rounded-xl border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-[#1877F2] font-black uppercase text-[10px] tracking-wider px-3.5 h-9 shadow-2xs cursor-pointer"
              title="Pega el enlace de cualquier publicación o nota de Facebook para agregarla de inmediato"
            >
              <Facebook className="mr-1.5 h-3.5 w-3.5 fill-[#1877F2]" />
              Importar Post FB
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSyncFacebook}
              disabled={syncingFb}
              className="rounded-xl border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-[#1877F2] font-black uppercase text-[10px] tracking-wider px-3.5 h-9 shadow-2xs cursor-pointer"
              title="Sincroniza publicaciones de tu página de Facebook para la sección Facebook"
            >
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5 text-[#1877F2]", syncingFb && "animate-spin")} />
              {syncingFb ? 'Sincronizando...' : 'Sync Facebook'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSyncYouTube}
              disabled={syncingYt}
              className="rounded-xl border-red-200 bg-red-50/50 hover:bg-red-50 text-red-700 font-black uppercase text-[10px] tracking-wider px-3.5 h-9 shadow-2xs cursor-pointer"
              title="Detecta nuevos videos y transmisiones en vivo de tu canal de YouTube y los publica como notas"
            >
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5 text-red-600", syncingYt && "animate-spin")} />
              {syncingYt ? 'Sincronizando...' : 'Sync YouTube'}
            </Button>
            <Link to="/admin/articulos/nuevo">
              <Button className="rounded-xl bg-[#00AEEF] hover:bg-[#00AEEF]/90 text-white font-black text-xs uppercase tracking-wider px-4 h-9 shadow-md shadow-[#00AEEF]/20 cursor-pointer">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Nueva Nota
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
            {/* Search Input */}
            <div className="lg:col-span-4 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input 
                placeholder="Buscar por título, autor o tema..." 
                className="pl-9 pr-8 h-9 rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white text-xs font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="lg:col-span-3 relative">
              <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#00AEEF]"
              >
                <option value="all">📁 Todas las Categorías ({articles.length})</option>
                {availableCategories.map((catName) => {
                  const count = categoryCounts.counts[catName.toLowerCase()] || 0;
                  return (
                    <option key={catName} value={catName}>
                      {catName} {count > 0 ? `(${count})` : ''}
                    </option>
                  );
                })}
                {categoryCounts.uncat > 0 && (
                  <option value="__uncategorized__">
                    ⚠️ Sin Categoría / General ({categoryCounts.uncat})
                  </option>
                )}
              </select>
            </div>

            {/* Date Period Filter */}
            <div className="lg:col-span-2 relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#00AEEF]"
              >
                <option value="all">📅 Todas las fechas</option>
                <option value="today">Hoy</option>
                <option value="last7days">Últimos 7 días</option>
                <option value="thisMonth">Este mes</option>
                <option value="lastMonth">Mes anterior</option>
                <option value="custom">Personalizado...</option>
              </select>
            </div>

            {/* Format Filter */}
            <div className="lg:col-span-2 relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value as any)}
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#00AEEF]"
              >
                <option value="all">Formatos: Todos</option>
                <option value="standard">Redacción Estándar</option>
                <option value="youtube">Videos / YouTube</option>
                <option value="facebook">Posts Facebook</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="lg:col-span-1 relative flex items-center">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="w-full h-9 px-2 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white text-[11px] font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#00AEEF]"
                title="Ordenar notas"
              >
                <option value="date_desc">Recientes</option>
                <option value="date_asc">Antiguos</option>
                <option value="views_desc">+ Vistas</option>
                <option value="interactions_desc">+ Interac.</option>
                <option value="title_asc">A-Z</option>
              </select>
            </div>
          </div>

          {/* Custom Date Range Picker when selected */}
          {dateFilter === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
              <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Rango de fecha:</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Desde:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-bold"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Hasta:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-bold"
                />
              </div>
              {(customStartDate || customEndDate) && (
                <button
                  type="button"
                  onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
                  className="text-[10px] text-red-500 hover:underline font-bold cursor-pointer"
                >
                  Limpiar fechas
                </button>
              )}
            </div>
          )}

          {/* Bottom summary and Active Filter Chips */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500">
                Mostrando <strong className="text-slate-900">{filteredArticles.length}</strong> de {articles.length} notas
              </span>

              {selectedCategory !== 'all' && (
                <Badge variant="outline" className="bg-blue-50 text-[#00AEEF] border-blue-200 text-[10px] font-bold flex items-center gap-1">
                  <span>Cat: {selectedCategory === '__uncategorized__' ? 'Sin Categoría' : selectedCategory}</span>
                  <button type="button" onClick={() => setSelectedCategory('all')} className="hover:text-blue-900 cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {dateFilter !== 'all' && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                  <span>
                    Fecha: {
                      dateFilter === 'today' ? 'Hoy' :
                      dateFilter === 'last7days' ? 'Últimos 7 días' :
                      dateFilter === 'thisMonth' ? 'Este mes' :
                      dateFilter === 'lastMonth' ? 'Mes anterior' : 'Personalizada'
                    }
                  </span>
                  <button type="button" onClick={() => setDateFilter('all')} className="hover:text-emerald-900 cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {formatFilter !== 'all' && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold flex items-center gap-1">
                  <span>Formato: {formatFilter}</span>
                  <button type="button" onClick={() => setFormatFilter('all')} className="hover:text-purple-900 cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 text-[11px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer px-2"
              >
                <RotateCcw className="mr-1 h-3 w-3" /> Limpiar filtros
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border-none bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-slate-50">
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">Artículo</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Categorías</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Fecha</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-center">Rendimiento</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20">
                    <div className="flex justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#00AEEF] border-t-transparent"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredArticles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-slate-400 font-medium">
                    No se encontraron artículos.
                  </TableCell>
                </TableRow>
              ) : (
                filteredArticles.map((article) => (
                  <TableRow key={article.id} className="hover:bg-slate-50/50 border-slate-50 transition-colors">
                    <TableCell className="py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                          <img 
                            src={getSafeImageUrl(article.imageUrl)} 
                            alt="" 
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-black text-slate-900 truncate max-w-[200px] lg:max-w-md">{article.title}</p>
                            {(article.facebookPostId || (article.categories && article.categories.includes('Facebook'))) ? (
                              <Badge className="bg-blue-50 text-[#1877F2] border-blue-200 text-[8px] font-black uppercase tracking-wider shrink-0 px-2 py-0.5">
                                Facebook
                              </Badge>
                            ) : (article.youtubeVideoId || article.videoUrl) ? (
                              <Badge className={cn(
                                "border text-[8px] font-black uppercase tracking-wider shrink-0 px-2 py-0.5",
                                article.isLiveStream 
                                  ? "bg-red-50 text-red-600 border-red-200" 
                                  : "bg-red-50/50 text-red-700 border-red-100"
                              )}>
                                {article.isLiveStream ? '🔴 En vivo' : 'YouTube'}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{article.author}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {article.categories?.slice(0, 2).map(cat => (
                          <Badge key={cat} variant="secondary" className="bg-slate-100 text-slate-600 border-none text-[9px] font-black uppercase tracking-widest px-2">
                            {cat}
                          </Badge>
                        ))}
                        {article.categories && article.categories.length > 2 && (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-400 border-none text-[9px] font-black uppercase tracking-widest px-2">
                            +{article.categories.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {format(getArticleDate(article), "d MMM, yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-4 text-[10px] font-black">
                        <span className="flex items-center gap-1 text-[#00AEEF]"><Eye className="h-3 w-3" /> {article.views}</span>
                        <span className="flex items-center gap-1 text-[#ED1C24]"><MessageCircle className="h-3 w-3" /> {article.interactions}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link to={`/nota/${article.slug}`} target="_blank">
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-[#FFF200]/20 hover:text-slate-900">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link to={`/admin/articulos/editar/${article.id}`}>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-[#00AEEF]/10 hover:text-[#00AEEF]">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-xl hover:bg-[#ED1C24]/10 hover:text-[#ED1C24]"
                          onClick={() => handleDelete(article.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* MODAL PARA IMPORTAR POST INDIVIDUAL DE FACEBOOK */}
      <AnimatePresence>
        {showFbImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => !importingFbPost && setShowFbImportModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 z-10 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center">
                    <Facebook className="h-5 w-5 fill-[#1877F2]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">
                      Importar Post de Facebook
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Publicación exclusiva en la sección Facebook
                    </p>
                  </div>
                </div>
                <button 
                  disabled={importingFbPost}
                  onClick={() => setShowFbImportModal(false)}
                  className="h-8 w-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleImportSingleFacebookPost} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Enlace de la publicación de Facebook
                  </label>
                  <Input 
                    type="url"
                    placeholder="https://www.facebook.com/zapotlan.grafico/posts/... o enlace compartido"
                    value={fbPostUrl}
                    onChange={(e) => setFbPostUrl(e.target.value)}
                    disabled={importingFbPost}
                    className="h-12 rounded-2xl border-slate-200 bg-slate-50 focus:bg-white text-xs transition-colors"
                    required
                  />
                  <p className="text-[10px] text-slate-400 leading-relaxed pl-1">
                    Pega cualquier enlace de publicación, video o reel de Facebook. La IA extraerá el texto, fotos y formato, guardándolo como un artículo exclusivo de la sección Facebook.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={importingFbPost}
                    onClick={() => setShowFbImportModal(false)}
                    className="rounded-xl text-xs font-bold text-slate-500"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={importingFbPost || !fbPostUrl.trim()}
                    className="rounded-xl bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-black text-xs uppercase tracking-wider px-5 shadow-md shadow-[#1877F2]/20"
                  >
                    {importingFbPost ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Facebook className="mr-1.5 h-3.5 w-3.5 fill-white" />
                        Importar y Publicar
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}

