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
  X
} from 'lucide-react';
import { useSettings } from '@/lib/SettingsContext';

export default function Categories() {
  const { settings } = useSettings();
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Form states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
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
          description: newCategoryDesc.trim()
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
          subcategories: []
        });
        toast.success('Categoría creada correctamente');
      }

      setNewCategoryName('');
      setNewCategoryDesc('');
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
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setNewCategoryName('');
    setNewCategoryDesc('');
  };

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

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Categorías y Secciones</h1>
            <p className="text-sm font-medium text-slate-500">
              Administra tus categorías, estructura subcategorías y decide cuáles destacar en la portada de "SECCIONES".
            </p>
          </div>
          <Button 
            onClick={handleSyncFromArticles}
            disabled={syncing}
            className="rounded-full bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest px-6 shadow-lg shadow-slate-200"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> Sincronizar desde Notas
          </Button>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Creator / Editor Column */}
          <div className="lg:col-span-4">
            <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden sticky top-28">
              <CardHeader className="border-b border-slate-50 p-6">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                  {editingCategory ? (
                    <>
                      <Edit className="h-5 w-5 text-brand-blue" /> Editar Categoría
                    </>
                  ) : (
                    <>
                      <FolderPlus className="h-5 w-5 text-[#00AEEF]" /> Crear Categoría
                    </>
                  )}
                </CardTitle>
                <CardDescription className="text-xs font-medium text-slate-400">
                  {editingCategory ? 'Modifica los datos de la categoría seleccionada.' : 'Registra una categoría principal en el portal.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleCreateOrUpdateCategory} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre</label>
                    <Input 
                      placeholder="Ej. Cultura, H. Ayuntamientos"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="h-11 rounded-xl border-slate-100 bg-slate-50 text-xs font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Descripción (Opcional)</label>
                    <Textarea 
                      placeholder="Breve explicación de la categoría."
                      value={newCategoryDesc}
                      onChange={(e) => setNewCategoryDesc(e.target.value)}
                      className="rounded-xl border-slate-100 bg-slate-50 text-xs font-bold min-h-[100px] resize-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      type="submit" 
                      className="flex-1 rounded-full bg-[#00AEEF] hover:bg-[#00AEEF]/90 text-white font-black uppercase tracking-widest"
                    >
                      Guardar
                    </Button>
                    {editingCategory && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleCancelEdit}
                        className="rounded-full border-slate-200 text-slate-500 font-black uppercase tracking-widest"
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* List Column */}
          <div className="lg:col-span-8 space-y-4">
            {loading ? (
              <div className="flex justify-center py-20 bg-white rounded-[2.5rem] shadow-sm">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#00AEEF] border-t-transparent"></div>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] shadow-sm p-8 space-y-4">
                <FolderLock className="h-12 w-12 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-500">No hay categorías registradas en la base de datos.</p>
                <p className="text-xs text-slate-400">Presiona "Sincronizar desde Notas" o completa el formulario lateral para agregar tu primera categoría.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {categories.map((cat) => {
                  const articleCount = categoryStats[cat.name.trim().toLowerCase()] || 0;
                  const isFeatured = settings.featuredCategories?.includes(cat.name);
                  
                  return (
                    <Card key={cat.id} className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden group">
                      <CardContent className="p-6 md:p-8 space-y-6">
                        {/* Header Area */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-black tracking-tight text-slate-900">{cat.name}</span>
                              <Badge className="bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100 px-3 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5">
                                <FileText className="h-2.5 w-2.5 text-[#00AEEF]" /> {articleCount} notas
                              </Badge>
                            </div>
                            {cat.description && (
                              <p className="text-xs text-slate-400 font-medium">{cat.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Toggle Sections */}
                            <button
                              onClick={() => handleToggleFeatured(cat.name)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                                isFeatured 
                                  ? 'bg-[#00AEEF]/10 text-[#00AEEF] border border-[#00AEEF]/20 shadow-sm' 
                                  : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-100'
                              }`}
                            >
                              <LayoutGrid className="h-3.5 w-3.5" />
                              {isFeatured ? 'Destacado Home ✓' : 'Destacar Home'}
                            </button>

                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleEditClick(cat)}
                              className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>

                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="h-8 w-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Subcategories Area */}
                        <div className="pt-4 border-t border-slate-50 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subcategorías</h4>
                            {activeSubcatInput !== cat.id && (
                              <button 
                                onClick={() => {
                                  setActiveSubcatInput(cat.id);
                                  setSubcatValue('');
                                }}
                                className="flex items-center text-[9px] font-black uppercase tracking-widest text-[#00AEEF] hover:text-[#00AEEF]/80 transition-colors"
                              >
                                <Plus className="h-3 w-3 mr-0.5" /> Agregar Subcategoría
                              </button>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {(cat.subcategories || []).map((sub) => (
                              <Badge 
                                key={sub} 
                                className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[10px] rounded-xl px-3 py-1 flex items-center gap-1.5 border border-slate-100/50"
                              >
                                {sub}
                                <button 
                                  type="button" 
                                  onClick={() => handleDeleteSubcategory(cat.id, sub)}
                                  className="text-slate-400 hover:text-red-500 transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                            {(!cat.subcategories || cat.subcategories.length === 0) && (
                              <p className="text-[9px] font-medium text-slate-400 italic">No tiene subcategorías. Los artículos se listarán directo en {cat.name}.</p>
                            )}
                          </div>

                          {/* Editable Inline Input */}
                          {activeSubcatInput === cat.id && (
                            <div className="flex items-center gap-2 max-w-sm mt-2 p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                              <Input 
                                placeholder="Ej. Ayuntamiento de Cd. Guzman"
                                value={subcatValue}
                                onChange={(e) => setSubcatValue(e.target.value)}
                                className="h-8 rounded-lg border-none bg-white text-xs font-bold ring-offset-transparent focus-visible:ring-0 shadow-none"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddSubcategory(cat.id);
                                  if (e.key === 'Escape') setActiveSubcatInput(null);
                                }}
                                autoFocus
                              />
                              <Button 
                                size="sm" 
                                onClick={() => handleAddSubcategory(cat.id)}
                                className="h-8 rounded-lg bg-[#00AEEF] hover:bg-[#00AEEF]/90 text-white font-black text-[9px] uppercase tracking-widest px-3"
                              >
                                Guardar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => setActiveSubcatInput(null)}
                                className="h-8 rounded-lg text-slate-400 hover:text-slate-600 px-2"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
