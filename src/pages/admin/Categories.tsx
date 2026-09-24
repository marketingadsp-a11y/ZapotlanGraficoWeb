import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import { Category, Article } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { 
  FolderLock, 
  FolderPlus, 
  FolderOpen, 
  Plus, 
  Trash2, 
  Edit, 
  Tags, 
  RefreshCw, 
  FileText, 
  ChevronRight, 
  Check, 
  Newspaper,
  LayoutGrid,
  ChevronDown,
  X,
  Search,
  Dumbbell,
  Sparkles,
  ExternalLink,
  Link2
} from 'lucide-react';
import { useSettings } from '@/lib/SettingsContext';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { SELECTABLE_ICONS, CATEGORY_ICON_MAP, resolveCategoryIcon } from '@/lib/constants';
import CategorySmartAnalyzer from '@/components/admin/CategorySmartAnalyzer';

export default function Categories() {
  const { settings } = useSettings();
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Form states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Newspaper');
  const [newCategoryCustomUrl, setNewCategoryCustomUrl] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Icon Picker Modal states
  const [showIconModal, setShowIconModal] = useState(false);
  const [iconTargetCategory, setIconTargetCategory] = useState<Category | null>(null);
  const [iconSearchTerm, setIconSearchTerm] = useState('');
  const [iconSelectedGroup, setIconSelectedGroup] = useState('Todos');
  
  // Subcategory inline input state
  const [activeSubcatInput, setActiveSubcatInput] = useState<string | null>(null); // category ID
  const [subcatValue, setSubcatValue] = useState('');

  // Count articles per category
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch categories
      const catSnap = await getDocs(collection(db, 'categories'));
      const catList: Category[] = [];
      catSnap.forEach((d) => {
        catList.push({ id: d.id, ...d.data() } as Category);
      });
      
      // Fetch articles to count stats
      const artSnap = await getDocs(collection(db, 'articles'));
      const artList: Article[] = [];
      artSnap.forEach((d) => {
        artList.push({ id: d.id, ...d.data() } as Article);
      });
      setArticles(artList);

      // Compute stats
      const stats: Record<string, number> = {};
      artList.forEach((art) => {
        if (Array.isArray(art.categories)) {
          art.categories.forEach((c) => {
            if (c) {
              const key = c.trim().toLowerCase();
              stats[key] = (stats[key] || 0) + 1;
            }
          });
        } else if (typeof art.categories === 'string') {
          const catStr = art.categories as string;
          catStr.split(',').forEach((c) => {
            const key = c.trim().toLowerCase();
            stats[key] = (stats[key] || 0) + 1;
          });
        }
      });
      setCategoryStats(stats);
      setCategories(catList);
    } catch (error) {
      console.error("Error fetching category data:", error);
      toast.error("Error al cargar los datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateOrUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      toast.error('El nombre de la categoría es obligatorio.');
      return;
    }

    const docId = editingCategory ? editingCategory.id : newCategoryName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const categoryRef = doc(db, 'categories', docId);

    try {
      if (editingCategory) {
        // Update
        await updateDoc(categoryRef, {
          name: newCategoryName.trim(),
          description: newCategoryDesc.trim(),
          icon: newCategoryIcon || 'Newspaper',
          customUrl: newCategoryCustomUrl.trim()
        });
        toast.success('Categoría actualizada correctamente');
      } else {
        // Create new
        const existingCat = categories.find(c => c.id === docId);
        if (existingCat) {
          toast.error('Ya existe una categoría con un nombre similar.');
          return;
        }

        await setDoc(categoryRef, {
          name: newCategoryName.trim(),
          description: newCategoryDesc.trim(),
          subcategories: [],
          icon: newCategoryIcon || 'Newspaper',
          customUrl: newCategoryCustomUrl.trim()
        });
        toast.success('Categoría creada correctamente');
      }

      setNewCategoryName('');
      setNewCategoryDesc('');
      setNewCategoryIcon('Newspaper');
      setNewCategoryCustomUrl('');
      setEditingCategory(null);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar la categoría.');
    }
  };

  const handleEditClick = (cat: Category) => {
    setEditingCategory(cat);
    setNewCategoryName(cat.name);
    setNewCategoryDesc(cat.description || '');
    setNewCategoryIcon(cat.icon || (cat.name.toLowerCase().includes('vital') ? 'Dumbbell' : 'Newspaper'));
    setNewCategoryCustomUrl(cat.customUrl || '');
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setNewCategoryName('');
    setNewCategoryDesc('');
    setNewCategoryIcon('Newspaper');
    setNewCategoryCustomUrl('');
  };

  // Auto-suggest gym/fitness icon or los anfitriones / revista path
  useEffect(() => {
    if (!editingCategory) {
      const lower = newCategoryName.toLowerCase();
      if (lower.includes('vital') || lower.includes('gym') || lower.includes('fitness') || lower.includes('ejercicio')) {
        setNewCategoryIcon('Dumbbell');
      } else if (lower.includes('anfitrion') || lower.includes('revista') || lower.includes('periodico')) {
        setNewCategoryIcon('BookOpen');
        if (!newCategoryCustomUrl) {
          setNewCategoryCustomUrl('/losanfitriones');
        }
      }
    }
  }, [newCategoryName, editingCategory]);

  const handleSelectIcon = async (iconName: string) => {
    if (iconTargetCategory) {
      try {
        await updateDoc(doc(db, 'categories', iconTargetCategory.id), {
          icon: iconName
        });
        toast.success(`Ícono de "${iconTargetCategory.name}" actualizado a ${iconName}`);
        fetchData();
      } catch (err) {
        toast.error('Error al actualizar ícono.');
      }
      setShowIconModal(false);
      setIconTargetCategory(null);
    } else {
      setNewCategoryIcon(iconName);
      setShowIconModal(false);
    }
  };

  const filteredIcons = SELECTABLE_ICONS.filter((item) => {
    const matchesGroup = iconSelectedGroup === 'Todos' || item.group === iconSelectedGroup;
    const term = iconSearchTerm.trim().toLowerCase();
    if (!term) return matchesGroup;

    const matchesDirect = item.name.toLowerCase().includes(term) || 
      item.label.toLowerCase().includes(term) || 
      item.group.toLowerCase().includes(term);

    const isGymSearch = term.includes('gym') || term.includes('ejercicio') || term.includes('pesa') || term.includes('fitness') || term.includes('vital');
    const isGymIcon = item.group === 'Gym & Fitness';

    return matchesGroup && (matchesDirect || (isGymSearch && isGymIcon));
  });

  const handleDeleteCategory = async (catId: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta categoría? No afectará a las notas ya escritas, pero dejarán de listarse en esta sección.')) {
      try {
        await deleteDoc(doc(db, 'categories', catId));
        toast.success('Categoría eliminada.');
        fetchData();
      } catch (error) {
        console.error(error);
        toast.error('Error al eliminar categoría.');
      }
    }
  };

  const handleAddSubcategory = async (catId: string) => {
    if (!subcatValue.trim()) return;

    const category = categories.find(c => c.id === catId);
    if (!category) return;

    const subcats = category.subcategories || [];
    if (subcats.includes(subcatValue.trim())) {
      toast.error('Esta subcategoría ya existe.');
      return;
    }

    const updatedSubcats = [...subcats, subcatValue.trim()];

    try {
      await updateDoc(doc(db, 'categories', catId), {
        subcategories: updatedSubcats
      });
      toast.success('Subcategoría agregada');
      setSubcatValue('');
      setActiveSubcatInput(null);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Error al agregar subcategoría.');
    }
  };

  const handleDeleteSubcategory = async (catId: string, subcatToRemove: string) => {
    const category = categories.find(c => c.id === catId);
    if (!category) return;

    const updatedSubcats = (category.subcategories || []).filter(s => s !== subcatToRemove);

    try {
      await updateDoc(doc(db, 'categories', catId), {
        subcategories: updatedSubcats
      });
      toast.success('Subcategoría eliminada.');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar subcategoría.');
    }
  };

  // Sync unique categories mentioned in articles to 'categories' collection in Firestore
  const handleSyncFromArticles = async () => {
    setSyncing(true);
    const toastId = toast.loading('Escaneando notas en base de datos...');
    try {
      const uniqueCats = new Set<string>();
      articles.forEach((art) => {
        if (Array.isArray(art.categories)) {
          art.categories.forEach((c) => c && uniqueCats.add(c.trim()));
        } else if (typeof art.categories === 'string') {
          const catStr = art.categories as string;
          catStr.split(',').forEach((c) => c && uniqueCats.add(c.trim()));
        }
      });

      let addedCount = 0;
      const batch = writeBatch(db);

      uniqueCats.forEach((prettyName) => {
        const id = prettyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        // Check if already in local categories state
        const exists = categories.find(c => c.id === id);
        if (!exists) {
          const ref = doc(db, 'categories', id);
          batch.set(ref, {
            name: prettyName,
            description: `Categoría sincronizada automáticamente desde notas anteriores.`,
            subcategories: []
          });
          addedCount++;
        }
      });

      if (addedCount > 0) {
        await batch.commit();
        toast.success(`Se agregaron ${addedCount} categorías nuevas encontradas en tus notas.`, { id: toastId });
        fetchData();
      } else {
        toast.info('Todas las categorías de tus notas ya están registradas.', { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al sincronizar categorías.', { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  // Toggle if category should appear in "Secciones (Home)"
  const handleToggleFeatured = async (catName: string) => {
    const featured = settings.featuredCategories || [];
    let updated: string[];

    if (featured.includes(catName)) {
      updated = featured.filter(f => f !== catName);
    } else {
      if (featured.length >= 15) {
        toast.error('Puedes tener un máximo de 15 categorías destacadas.');
        return;
      }
      updated = [...featured, catName];
    }

    try {
      await setDoc(doc(db, 'config', 'site'), {
        ...settings,
        featuredCategories: updated
      }, { merge: true });
      toast.success(featured.includes(catName) ? 'Removida de Secciones (Home)' : 'Agregada a Secciones (Home)');
    } catch (error) {
      toast.error('Error al actualizar preferencias de Secciones.');
    }
  };

  // Active view: 'list' or 'analyzer'
  const [activeView, setActiveView] = useState<'list' | 'analyzer'>('list');

  // Count articles that are in "General", empty, or "Noticias"
  const generalArticlesCount = articles.filter(art => {
    let cat = '';
    if (Array.isArray(art.categories) && art.categories.length > 0) cat = art.categories[0];
    else if (typeof art.categories === 'string') cat = (art.categories as string).split(',')[0].trim();
    return !cat || cat.toLowerCase() === 'general' || cat.toLowerCase() === 'sin categoría';
  }).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight uppercase text-slate-900">
                Categorías y Secciones
              </h1>
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border-slate-200">
                {categories.length} activas
              </Badge>
            </div>
            <p className="text-xs font-medium text-slate-500 max-w-xl">
              Organiza la estructura temática del portal, define qué categorías aparecen en la barra de Secciones y reclasifica notas en lote.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View switcher buttons */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setActiveView('list')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeView === 'list'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Categorías</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('analyzer')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeView === 'analyzer'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Analizador Inteligente</span>
                {generalArticlesCount > 0 && (
                  <span className="h-4 px-1.5 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center ml-1">
                    {generalArticlesCount}
                  </span>
                )}
              </button>
            </div>

            <Button 
              onClick={handleSyncFromArticles}
              disabled={syncing}
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-black uppercase tracking-wider text-[11px] h-9 px-4 cursor-pointer"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} /> Sincronizar
            </Button>
          </div>
        </div>

        {/* Executive Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Categorías</span>
            <p className="text-xl font-black text-slate-900">{categories.length}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">En Barra Secciones</span>
            <p className="text-xl font-black text-[#00AEEF]">
              {(settings.featuredCategories || []).length} <span className="text-xs text-slate-400 font-bold">/ 15</span>
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Notas Publicadas</span>
            <p className="text-xl font-black text-slate-900">{articles.length}</p>
          </div>

          <div 
            onClick={() => setActiveView('analyzer')}
            className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 shadow-2xs space-y-0.5 cursor-pointer hover:bg-amber-100/70 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">En General / Sin Cat.</span>
              <span className="text-[9px] font-black text-amber-700 uppercase group-hover:underline">Acomodar →</span>
            </div>
            <p className="text-xl font-black text-amber-900">{generalArticlesCount}</p>
          </div>
        </div>

        {/* VIEW 1: SMART ANALYZER */}
        {activeView === 'analyzer' && (
          <CategorySmartAnalyzer
            articles={articles}
            categories={categories}
            onRefreshCategories={fetchData}
            onClose={() => setActiveView('list')}
          />
        )}

        {/* VIEW 2: COMPACT CATEGORY LIST & EDITOR */}
        {activeView === 'list' && (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Creator / Editor Column (Compact) */}
            <div className="lg:col-span-4">
              <Card className="border border-slate-200/80 shadow-sm bg-white rounded-2xl overflow-hidden sticky top-24">
                <CardHeader className="border-b border-slate-100 p-4">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                    {editingCategory ? (
                      <>
                        <Edit className="h-4 w-4 text-[#00AEEF]" /> Editar Categoría
                      </>
                    ) : (
                      <>
                        <FolderPlus className="h-4 w-4 text-[#00AEEF]" /> Nueva Categoría
                      </>
                    )}
                  </CardTitle>
                  <CardDescription className="text-[11px] font-medium text-slate-400">
                    {editingCategory ? 'Modifica los datos de la categoría.' : 'Registra una categoría en el portal.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <form onSubmit={handleCreateOrUpdateCategory} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nombre</label>
                      <Input 
                        placeholder="Ej. Cultura, VITALfit, Deportes"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="h-9 rounded-xl border-slate-200 bg-slate-50 text-xs font-bold"
                        required
                      />
                    </div>

                    {/* Icon Selector Field */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ícono</label>
                        <button
                          type="button"
                          onClick={() => {
                            setIconTargetCategory(null);
                            setShowIconModal(true);
                          }}
                          className="text-[9px] font-black uppercase tracking-wider text-[#00AEEF] hover:underline cursor-pointer"
                        >
                          Catálogo ({SELECTABLE_ICONS.length})
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIconTargetCategory(null);
                            setShowIconModal(true);
                          }}
                          className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer group shadow-2xs"
                        >
                          <div className="flex items-center gap-2">
                            {(() => {
                              const IconComp = CATEGORY_ICON_MAP[newCategoryIcon] || Newspaper;
                              return (
                                <div className="h-6 w-6 rounded-lg bg-blue-50 text-[#00AEEF] flex items-center justify-center shrink-0">
                                  <IconComp className="h-3.5 w-3.5" />
                                </div>
                              );
                            })()}
                            <span className="text-xs font-bold text-slate-700">{newCategoryIcon}</span>
                          </div>
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                      </div>

                      {/* Quick suggestions */}
                      <div className="pt-0.5 flex flex-wrap gap-1 items-center">
                        {[
                          { name: 'Dumbbell', label: 'Gym/Pesas' },
                          { name: 'Flame', label: 'Calorías' },
                          { name: 'Trophy', label: 'Deportes' },
                          { name: 'ShieldAlert', label: 'Seguridad' },
                          { name: 'Palette', label: 'Cultura' }
                        ].map((item) => (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => setNewCategoryIcon(item.name)}
                            className={cn(
                              "px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer",
                              newCategoryIcon === item.name
                                ? "bg-[#00AEEF] text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Descripción (Opcional)</label>
                      <Textarea 
                        placeholder="Breve explicación de la sección..."
                        value={newCategoryDesc}
                        onChange={(e) => setNewCategoryDesc(e.target.value)}
                        className="rounded-xl border-slate-200 bg-slate-50 text-xs font-medium min-h-[70px] resize-none"
                      />
                    </div>

                    {/* Enlace a Sección / Menú Principal (Opcional) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Enlace a Menú / Sección (Opcional)
                        </label>
                        {newCategoryCustomUrl && (
                          <button
                            type="button"
                            onClick={() => setNewCategoryCustomUrl('')}
                            className="text-[9px] font-bold text-red-500 hover:underline cursor-pointer"
                          >
                            Quitar enlace
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input 
                          placeholder="Ej. /revista o /noticias (por defecto: /categoria/Nombre)"
                          value={newCategoryCustomUrl}
                          onChange={(e) => setNewCategoryCustomUrl(e.target.value)}
                          className="h-9 pl-8 rounded-xl border-slate-200 bg-slate-50 text-xs font-bold font-mono"
                        />
                      </div>
                      {/* Accesos directos a secciones del portal */}
                      <div className="pt-0.5 flex flex-wrap gap-1 items-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mr-0.5">Accesos:</span>
                        {[
                          { path: '/losanfitriones', label: 'Los Anfitriones (/losanfitriones)' },
                          { path: '/periodico', label: 'Periódico (/periodico)' },
                          { path: '/noticias', label: 'Noticias (/noticias)' },
                          { path: '/videos', label: 'Videos (/videos)' },
                          { path: '/facebook', label: 'Facebook (/facebook)' }
                        ].map((sec) => (
                          <button
                            key={sec.path}
                            type="button"
                            onClick={() => setNewCategoryCustomUrl(sec.path)}
                            className={cn(
                              "px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer",
                              newCategoryCustomUrl === sec.path
                                ? "bg-indigo-600 text-white shadow-2xs"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                          >
                            {sec.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium leading-tight">
                        Al definir una ruta como <code>/revista</code>, al hacer clic en esta categoría se abrirá esa sección en vez de la lista tradicional.
                      </p>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button 
                        type="submit" 
                        size="sm"
                        className="flex-1 rounded-xl bg-[#00AEEF] hover:bg-[#00AEEF]/90 text-white font-black text-xs uppercase tracking-wider h-9 cursor-pointer shadow-xs"
                      >
                        {editingCategory ? 'Actualizar' : 'Guardar'}
                      </Button>
                      {editingCategory && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={handleCancelEdit}
                          className="rounded-xl border-slate-200 text-slate-500 font-black text-xs uppercase tracking-wider h-9"
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* List Column (Compact & Sleek) */}
            <div className="lg:col-span-8 space-y-3">
              {loading ? (
                <div className="flex justify-center py-16 bg-white rounded-2xl border border-slate-200/80">
                  <div className="h-7 w-7 animate-spin rounded-full border-3 border-[#00AEEF] border-t-transparent"></div>
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3">
                  <FolderLock className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-500">No hay categorías registradas.</p>
                  <p className="text-[11px] text-slate-400">Usa "Sincronizar" o crea tu primera categoría.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {categories.map((cat) => {
                    const articleCount = categoryStats[cat.name.trim().toLowerCase()] || 0;
                    const isFeatured = (settings.featuredCategories || []).includes(cat.name);
                    
                    return (
                      <div 
                        key={cat.id} 
                        className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs hover:border-slate-300 transition-all space-y-2.5 group"
                      >
                        {/* Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Clickable Category Icon */}
                            {(() => {
                              const IconComp = resolveCategoryIcon(cat.name, cat.icon);
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIconTargetCategory(cat);
                                    setShowIconModal(true);
                                  }}
                                  title="Cambiar ícono"
                                  className="h-9 w-9 rounded-xl bg-blue-50/90 hover:bg-blue-100 text-[#00AEEF] border border-blue-100 flex items-center justify-center transition-all cursor-pointer shrink-0 relative group/btn"
                                >
                                  <IconComp className="h-4.5 w-4.5" />
                                  <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-white border border-slate-200 text-slate-500 flex items-center justify-center text-[7px] shadow-2xs">
                                    ✎
                                  </span>
                                </button>
                              );
                            })()}

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-black text-slate-900 tracking-tight">{cat.name}</span>
                                <Badge className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.2 text-[9px] font-black rounded-md flex items-center gap-1">
                                  <FileText className="h-2.5 w-2.5 text-[#00AEEF]" /> {articleCount} notas
                                </Badge>
                                {cat.customUrl && (
                                  <Link
                                    to={cat.customUrl}
                                    target={cat.customUrl.startsWith('http') ? '_blank' : undefined}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-black hover:bg-indigo-100 transition-colors"
                                    title={`Abre: ${cat.customUrl}`}
                                  >
                                    <ExternalLink className="h-2.5 w-2.5" />
                                    <span>Enlaza a: {cat.customUrl}</span>
                                  </Link>
                                )}
                              </div>
                              {cat.description && (
                                <p className="text-[11px] text-slate-400 font-medium truncate max-w-md">
                                  {cat.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Quick Actions Row */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                            {/* Toggle Featured in Secciones */}
                            <button
                              type="button"
                              onClick={() => handleToggleFeatured(cat.name)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                isFeatured 
                                  ? 'bg-[#00AEEF]/10 text-[#00AEEF] border border-[#00AEEF]/30' 
                                  : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200'
                              }`}
                            >
                              <LayoutGrid className="h-3 w-3" />
                              <span>{isFeatured ? 'En Secciones ✓' : '+ Secciones'}</span>
                            </button>

                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditClick(cat)}
                              className="h-7 w-7 p-0 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>

                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="h-7 w-7 p-0 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Compact Subcategories Strip */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-50 text-[10px]">
                          <span className="font-black uppercase tracking-wider text-slate-400 text-[9px]">
                            Subcategorías:
                          </span>
                          {(cat.subcategories || []).map((sub) => (
                            <span 
                              key={sub} 
                              className="inline-flex items-center gap-1 bg-slate-50 text-slate-700 font-bold px-2 py-0.5 rounded-md border border-slate-100"
                            >
                              <span>{sub}</span>
                              <button 
                                type="button" 
                                onClick={() => handleDeleteSubcategory(cat.id, sub)}
                                className="text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </span>
                          ))}

                          {activeSubcatInput === cat.id ? (
                            <div className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
                              <input 
                                placeholder="Subcategoría..."
                                value={subcatValue}
                                onChange={(e) => setSubcatValue(e.target.value)}
                                className="h-6 px-1.5 rounded bg-white text-[10px] font-bold border border-slate-200 focus:outline-none"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddSubcategory(cat.id);
                                  if (e.key === 'Escape') setActiveSubcatInput(null);
                                }}
                                autoFocus
                              />
                              <Button 
                                size="sm" 
                                onClick={() => handleAddSubcategory(cat.id)}
                                className="h-6 rounded bg-[#00AEEF] text-white text-[9px] font-bold px-2"
                              >
                                OK
                              </Button>
                              <button 
                                onClick={() => setActiveSubcatInput(null)}
                                className="text-slate-400 hover:text-slate-600 px-1"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => {
                                setActiveSubcatInput(cat.id);
                                setSubcatValue('');
                              }}
                              className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider text-[#00AEEF] hover:underline cursor-pointer px-1 py-0.5"
                            >
                              <Plus className="h-2.5 w-2.5" /> Agregar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL SELECTOR DE ÍCONOS */}
      <AnimatePresence>
        {showIconModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => {
                setShowIconModal(false);
                setIconTargetCategory(null);
              }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 z-10 flex flex-col space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#00AEEF]/10 text-[#00AEEF] flex items-center justify-center shadow-xs">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">
                      Seleccionar Ícono de Categoría
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {iconTargetCategory 
                        ? `Asignar ícono para: "${iconTargetCategory.name}"`
                        : 'Elige el ícono que representará a esta categoría en Secciones'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowIconModal(false);
                    setIconTargetCategory(null);
                  }}
                  className="h-8 w-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Search & Groups */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Buscar ícono (ej. gym, pesas, deportes, salud, noticias)..."
                    value={iconSearchTerm}
                    onChange={(e) => setIconSearchTerm(e.target.value)}
                    className="h-11 pl-10 rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold"
                  />
                </div>

                {/* Filter group pills */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  {['Todos', 'Gym & Fitness', 'Deportes & Ocio', 'Salud & Vida', 'Noticias & Editorial', 'Cultura & Arte', 'Tecnología & Negocios', 'Otros'].map((grp) => (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => setIconSelectedGroup(grp)}
                      className={cn(
                        "px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                        iconSelectedGroup === grp
                          ? "bg-[#00AEEF] text-white shadow-xs font-bold"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      {grp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icons Grid with Scroll */}
              <div className="flex-1 overflow-y-auto pr-1 max-h-[380px] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {filteredIcons.map((item) => {
                  const IconComponent = item.icon;
                  const activeIconName = iconTargetCategory 
                    ? (iconTargetCategory.icon || (iconTargetCategory.name.toLowerCase().includes('vital') ? 'Dumbbell' : 'Newspaper')) 
                    : newCategoryIcon;
                  const isCurrent = activeIconName === item.name;

                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => handleSelectIcon(item.name)}
                      className={cn(
                        "p-3 rounded-2xl border text-left flex flex-col items-center gap-2 transition-all cursor-pointer group hover:scale-102",
                        isCurrent
                          ? "border-[#00AEEF] bg-[#00AEEF]/10 text-[#00AEEF] shadow-xs font-bold"
                          : "border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-300 text-slate-700"
                      )}
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
                        isCurrent ? "bg-[#00AEEF] text-white shadow-xs" : "bg-white text-slate-600 group-hover:text-[#00AEEF] shadow-xs"
                      )}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="text-center w-full min-w-0">
                        <p className="text-[11px] font-black truncate">{item.name}</p>
                        <p className="text-[9px] text-slate-400 font-medium truncate">{item.label}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
