import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { NavMenuItem, Category } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Compass, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  RotateCcw, 
  Save, 
  Sparkles, 
  Check, 
  Search, 
  X, 
  Layers, 
  Smartphone, 
  Monitor, 
  ChevronRight, 
  FolderPlus,
  Link as LinkIcon,
  HelpCircle,
  Hash
} from 'lucide-react';
import { useSettings } from '@/lib/SettingsContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { DEFAULT_NAV_MENU, SELECTABLE_ICONS, CATEGORY_ICON_MAP, resolveCategoryIcon } from '@/lib/constants';

export default function PublicMenuEditor() {
  const { settings, categories } = useSettings();
  const [menuItems, setMenuItems] = useState<NavMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Form / Modal state for adding/editing an item
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLabel, setFormLabel] = useState('');
  const [formPath, setFormPath] = useState('');
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formOpenInNewTab, setFormOpenInNewTab] = useState(false);
  const [formIcon, setFormIcon] = useState('Newspaper');
  const [formBadge, setFormBadge] = useState('');

  // Icon Picker modal within the form
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [iconGroup, setIconGroup] = useState('Todos');

  // Preview tab: desktop vs mobile
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  // Load menu items
  useEffect(() => {
    if (settings) {
      if (settings.navigationMenu && Array.isArray(settings.navigationMenu) && settings.navigationMenu.length > 0) {
        // Sort by order ascending
        const sorted = [...settings.navigationMenu].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setMenuItems(sorted);
      } else {
        setMenuItems(DEFAULT_NAV_MENU);
      }
      setLoading(false);
    }
  }, [settings]);

  // Open modal for new item
  const handleAddNew = () => {
    setEditingId(null);
    setFormLabel('');
    setFormPath('');
    setFormOrder(menuItems.length > 0 ? Math.max(...menuItems.map(i => i.order || 0)) + 1 : 1);
    setFormIsActive(true);
    setFormOpenInNewTab(false);
    setFormIcon('Globe');
    setFormBadge('');
    setIsModalOpen(true);
  };

  // Open modal for editing existing item
  const handleEdit = (item: NavMenuItem) => {
    setEditingId(item.id);
    setFormLabel(item.label);
    setFormPath(item.path);
    setFormOrder(item.order);
    setFormIsActive(item.isActive !== false);
    setFormOpenInNewTab(Boolean(item.openInNewTab));
    setFormIcon(item.icon || 'Globe');
    setFormBadge(item.badge || '');
    setIsModalOpen(true);
  };

  // Centralized save & sanitize function to ensure 100% clean Firestore serialization
  const persistMenu = async (list: NavMenuItem[], successMessage?: string) => {
    setSaving(true);
    try {
      const sanitized = list.map((item, idx) => {
        const clean: Record<string, any> = {
          id: String(item.id || `nav_${idx + 1}`),
          label: String(item.label || '').trim(),
          path: String(item.path || '/').trim(),
          order: Number(idx + 1),
          isActive: item.isActive !== false,
          openInNewTab: Boolean(item.openInNewTab),
          icon: String(item.icon || 'Globe')
        };
        if (item.badge && item.badge.trim()) {
          clean.badge = item.badge.trim();
        }
        return clean;
      });

      const payload = JSON.parse(JSON.stringify(sanitized));

      await setDoc(doc(db, 'config', 'site'), {
        navigationMenu: payload
      }, { merge: true });

      setMenuItems(sanitized as NavMenuItem[]);
      setHasUnsavedChanges(false);

      if (successMessage) {
        toast.success(successMessage);
      }
      return true;
    } catch (err: any) {
      console.error('Error saving menu to Firestore:', err);
      toast.error('Error al guardar el menú en la base de datos.', {
        description: err?.message || 'Error desconocido'
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Save item from modal form
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel.trim()) {
      toast.error('Por favor escribe un nombre para la sección.');
      return;
    }
    if (!formPath.trim()) {
      toast.error('Por favor indica la ruta o enlace (ej: /noticias o /categoria/Deportes).');
      return;
    }

    let updatedList = [...menuItems];
    const cleanBadge = formBadge.trim();

    if (editingId) {
      // Edit existing
      updatedList = updatedList.map((item) => {
        if (item.id === editingId) {
          const updated: NavMenuItem = {
            id: item.id,
            label: formLabel.trim(),
            path: formPath.trim(),
            order: Number(formOrder) || item.order,
            isActive: formIsActive,
            openInNewTab: Boolean(formOpenInNewTab),
            icon: formIcon || 'Globe',
          };
          if (cleanBadge) updated.badge = cleanBadge;
          return updated;
        }
        return item;
      });
    } else {
      // Create new
      const newId = `nav_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newItem: NavMenuItem = {
        id: newId,
        label: formLabel.trim(),
        path: formPath.trim(),
        order: Number(formOrder) || (menuItems.length + 1),
        isActive: formIsActive,
        openInNewTab: Boolean(formOpenInNewTab),
        icon: formIcon || 'Globe',
      };
      if (cleanBadge) newItem.badge = cleanBadge;
      updatedList.push(newItem);
    }

    // Re-sort by order
    updatedList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setMenuItems(updatedList);
    setIsModalOpen(false);

    // Save directly to Firestore
    await persistMenu(
      updatedList, 
      editingId ? `Sección "${formLabel}" actualizada y guardada con éxito.` : `Sección "${formLabel}" agregada y guardada con éxito.`
    );
  };

  // Delete an item
  const handleDelete = async (id: string, label: string) => {
    if (menuItems.length <= 1) {
      toast.error('Debe haber al menos un elemento en el menú.');
      return;
    }
    if (!confirm(`¿Eliminar la sección "${label}" del menú público?`)) return;

    const filtered = menuItems.filter(i => i.id !== id);
    const reindexed = filtered.map((item, index) => ({
      ...item,
      order: index + 1
    }));
    setMenuItems(reindexed);
    await persistMenu(reindexed, `Sección "${label}" eliminada correctamente.`);
  };

  // Toggle active/inactive visibility
  const handleToggleActive = async (id: string) => {
    const updated = menuItems.map(item => {
      if (item.id === id) {
        return { ...item, isActive: !item.isActive };
      }
      return item;
    });
    setMenuItems(updated);
    await persistMenu(updated);
  };

  // Move item up in order
  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newList = [...menuItems];
    const temp = newList[index - 1];
    newList[index - 1] = newList[index];
    newList[index] = temp;

    const reindexed = newList.map((item, idx) => ({ ...item, order: idx + 1 }));
    setMenuItems(reindexed);
    await persistMenu(reindexed);
  };

  // Move item down in order
  const handleMoveDown = async (index: number) => {
    if (index === menuItems.length - 1) return;
    const newList = [...menuItems];
    const temp = newList[index + 1];
    newList[index + 1] = newList[index];
    newList[index] = temp;

    const reindexed = newList.map((item, idx) => ({ ...item, order: idx + 1 }));
    setMenuItems(reindexed);
    await persistMenu(reindexed);
  };

  // Add category directly from existing category database
  const handleAddCategoryQuick = async (cat: Category) => {
    const targetPath = cat.customUrl || `/categoria/${cat.name}`;
    const existing = menuItems.find(
      i => i.path.toLowerCase() === targetPath.toLowerCase() || i.label.toLowerCase() === cat.name.toLowerCase()
    );

    if (existing) {
      toast.info(`La sección "${cat.name}" ya existe en el menú.`);
      return;
    }

    const newItem: NavMenuItem = {
      id: `nav_cat_${Date.now()}`,
      label: cat.name,
      path: targetPath,
      order: menuItems.length + 1,
      isActive: true,
      openInNewTab: false,
      icon: cat.icon || 'Newspaper'
    };

    const updated = [...menuItems, newItem];
    setMenuItems(updated);
    await persistMenu(updated, `Categoría "${cat.name}" añadida y guardada.`);
  };

  // Save changes explicitly from top button
  const handleSaveToFirestore = async () => {
    await persistMenu(menuItems, '¡Menú público guardado y publicado con éxito!');
  };

  // Reset to default menu
  const handleResetToDefaults = async () => {
    if (!confirm('¿Restablecer el menú público a las opciones predeterminadas (Inicio, Noticias, Los Anfitriones, Videos, Facebook)?')) {
      return;
    }
    setMenuItems(DEFAULT_NAV_MENU);
    await persistMenu(DEFAULT_NAV_MENU, 'Menú restablecido a valores predeterminados y guardado.');
  };

  // Filter icon list for icon picker modal
  const iconGroups = ['Todos', 'Noticias & Editorial', 'Deportes & Ocio', 'Salud & Vida', 'Cultura & Arte', 'Tecnología & Negocios', 'Redes Sociales', 'Gym & Fitness', 'Otros'];
  const filteredIcons = SELECTABLE_ICONS.filter(item => {
    const matchesGroup = iconGroup === 'Todos' || item.group === iconGroup;
    const matchesSearch = !iconSearch.trim() || 
      item.label.toLowerCase().includes(iconSearch.toLowerCase()) || 
      item.name.toLowerCase().includes(iconSearch.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  const activeMenuItems = menuItems.filter(i => i.isActive !== false);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-blue border-t-transparent" />
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Cargando menú público...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8 pb-16">
        {/* Header Banner */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="space-y-1 z-10">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                <Compass className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-600">Navegación del Sitio</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900">Menú de Secciones Públicas</h1>
            <p className="text-xs text-slate-500 max-w-2xl">
              Controla las pestañas de navegación que ven los lectores en la cabecera superior, menú móvil y pie de página. Personaliza sus nombres, orden, enlaces y visibilidad en tiempo real.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToDefaults}
              className="rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
              title="Restablecer a valores iniciales"
            >
              <RotateCcw className="h-4 w-4 mr-2 text-slate-400" />
              Por Defecto
            </Button>

            <Button
              onClick={handleAddNew}
              size="sm"
              className="rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md shadow-slate-200"
            >
              <Plus className="h-4 w-4 mr-1.5 text-brand-blue" />
              Nueva Sección
            </Button>

            <Button
              onClick={handleSaveToFirestore}
              disabled={saving}
              size="sm"
              className={cn(
                "rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg",
                hasUnsavedChanges
                  ? "bg-[#00AEEF] hover:bg-[#0096ce] text-white shadow-sky-200 animate-pulse"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100"
              )}
            >
              {saving ? (
                <>
                  <div className="h-3.5 w-3.5 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {hasUnsavedChanges ? "Guardar Cambios *" : "Guardado"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Live Visual Preview Section */}
        <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-gradient-to-b from-white to-slate-50/50">
          <CardHeader className="p-6 md:p-8 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand-yellow" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Previsualización Interactiva</span>
                </div>
                <CardTitle className="text-lg font-black text-slate-900 mt-1">Cómo se verá en la web</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Esta es la apariencia exacta que tendrán los enlaces en la barra de navegación pública.
                </CardDescription>
              </div>

              {/* Device Selector */}
              <div className="flex items-center p-1 bg-slate-100 rounded-2xl self-start sm:self-auto border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                    previewDevice === 'desktop' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  Escritorio
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                    previewDevice === 'mobile' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  Móvil
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 md:p-10 flex flex-col items-center justify-center min-h-[160px] bg-slate-50/80">
            {previewDevice === 'desktop' ? (
              /* Desktop Pill Preview */
              <div className="w-full flex flex-col items-center gap-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Barra de navegación de escritorio</div>
                <nav className="inline-flex flex-wrap items-center justify-center bg-slate-100/80 p-2 rounded-full border border-slate-200 shadow-sm gap-1 max-w-full">
                  {activeMenuItems.map((item, idx) => {
                    const Icon = resolveCategoryIcon(item.label, item.icon);
                    const isSelected = idx === activePreviewIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActivePreviewIndex(idx)}
                        className={cn(
                          "relative px-5 py-2 text-[11px] font-black uppercase tracking-widest transition-all rounded-full flex items-center gap-1.5",
                          isSelected ? "text-white" : "text-slate-600 hover:text-slate-950 hover:bg-white/60"
                        )}
                      >
                        <span className="relative z-10 flex items-center gap-1.5">
                          <Icon className={cn("h-3.5 w-3.5", isSelected ? "text-brand-blue" : "text-slate-400")} />
                          {item.label}
                          {item.badge && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-brand-red text-white uppercase font-black tracking-normal">
                              {item.badge}
                            </span>
                          )}
                          {item.openInNewTab && (
                            <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                          )}
                        </span>
                        {isSelected && (
                          <motion.div 
                            layoutId="preview-nav-pill" 
                            className="absolute inset-0 bg-slate-900 rounded-full shadow-md shadow-slate-200"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                          />
                        )}
                      </button>
                    );
                  })}
                  {activeMenuItems.length === 0 && (
                    <span className="text-xs text-slate-400 px-4 py-2 italic font-medium">No hay secciones activas visibles.</span>
                  )}
                </nav>
                <p className="text-[11px] text-slate-400 font-medium">Haz clic en cualquier pestaña para ver su efecto visual.</p>
              </div>
            ) : (
              /* Mobile Drawer Preview */
              <div className="w-full max-w-xs bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <span className="text-xs font-black tracking-tighter text-brand-blue">
                    ZAPOTLÁN <span className="text-brand-red">GRÁFICO</span>
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Menú Móvil</span>
                </div>

                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {activeMenuItems.map((item, idx) => {
                    const Icon = resolveCategoryIcon(item.label, item.icon);
                    const isSelected = idx === activePreviewIndex;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setActivePreviewIndex(idx)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer",
                          isSelected ? "bg-brand-blue/10 text-brand-blue" : "text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className={cn("h-4 w-4", isSelected ? "text-brand-blue" : "text-slate-400")} />
                          {item.label}
                          {item.badge && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-brand-red text-white uppercase font-black">
                              {item.badge}
                            </span>
                          )}
                        </span>
                        <ChevronRight className={cn("h-3.5 w-3.5", isSelected ? "opacity-100" : "opacity-30")} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Add from Existing Categories */}
        {categories && categories.length > 0 && (
          <Card className="rounded-3xl border-slate-100 shadow-sm p-6 bg-white space-y-4">
            <div className="flex items-center gap-2">
              <FolderPlus className="h-4 w-4 text-emerald-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">
                Añadir Categorías Existentes al Menú con 1 Clic
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Haz clic en cualquier categoría existente en la base de datos para integrarla automáticamente a la barra de menú público:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {categories.map((cat) => {
                const targetPath = cat.customUrl || `/categoria/${cat.name}`;
                const isAlreadyInMenu = menuItems.some(
                  i => i.path.toLowerCase() === targetPath.toLowerCase() || i.label.toLowerCase() === cat.name.toLowerCase()
                );
                const Icon = resolveCategoryIcon(cat.name, cat.icon);

                return (
                  <button
                    key={cat.id || cat.name}
                    type="button"
                    onClick={() => handleAddCategoryQuick(cat)}
                    disabled={isAlreadyInMenu}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all border",
                      isAlreadyInMenu
                        ? "bg-slate-50 text-slate-400 border-slate-200/60 cursor-default opacity-70"
                        : "bg-white text-slate-700 border-slate-200 hover:border-brand-blue hover:text-brand-blue hover:shadow-sm active:scale-95"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{cat.name}</span>
                    {isAlreadyInMenu ? (
                      <Check className="h-3 w-3 text-emerald-500 ml-1" />
                    ) : (
                      <Plus className="h-3 w-3 text-slate-400 ml-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* Main Menu Items Management Table */}
        <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-brand-blue" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Elementos Configurados</span>
              </div>
              <CardTitle className="text-lg font-black text-slate-900 mt-1">Listado de Secciones ({menuItems.length})</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Usa las flechas para subir o bajar la posición de cada enlace, o haz clic en "Editar" para modificar sus datos.
              </CardDescription>
            </div>

            <Button
              onClick={handleAddNew}
              size="sm"
              className="rounded-2xl bg-brand-blue hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-100 self-start md:self-auto"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Añadir Enlace
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="py-4 px-6 w-16 text-center">Posición</th>
                    <th className="py-4 px-4">Sección / Nombre</th>
                    <th className="py-4 px-4">Ruta o Enlace</th>
                    <th className="py-4 px-4 text-center">Destino</th>
                    <th className="py-4 px-4 text-center">Estado</th>
                    <th className="py-4 px-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {menuItems.map((item, index) => {
                    const Icon = resolveCategoryIcon(item.label, item.icon);
                    const isFirst = index === 0;
                    const isLast = index === menuItems.length - 1;

                    return (
                      <tr 
                        key={item.id} 
                        className={cn(
                          "transition-colors hover:bg-slate-50/80 group",
                          !item.isActive && "opacity-50 bg-slate-50/40"
                        )}
                      >
                        {/* Order & Reordering buttons */}
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center gap-1">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-black text-[11px] flex items-center justify-center">
                              {index + 1}
                            </span>
                            <div className="flex flex-col gap-0.5 ml-1">
                              <button
                                type="button"
                                disabled={isFirst}
                                onClick={() => handleMoveUp(index)}
                                title="Subir posición"
                                className={cn(
                                  "p-1 rounded hover:bg-slate-200 transition-colors",
                                  isFirst ? "text-slate-200 cursor-not-allowed" : "text-slate-500 hover:text-slate-900"
                                )}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={isLast}
                                onClick={() => handleMoveDown(index)}
                                title="Bajar posición"
                                className={cn(
                                  "p-1 rounded hover:bg-slate-200 transition-colors",
                                  isLast ? "text-slate-200 cursor-not-allowed" : "text-slate-500 hover:text-slate-900"
                                )}
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Label & Icon */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">{item.label}</span>
                                {item.badge && (
                                  <Badge className="bg-brand-red text-white text-[9px] font-black uppercase px-1.5 py-0">
                                    {item.badge}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">ID: {item.id}</span>
                            </div>
                          </div>
                        </td>

                        {/* Path / Link */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 max-w-xs truncate inline-block">
                              {item.path}
                            </span>
                            {item.path.startsWith('/') ? (
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Ruta local</span>
                            ) : (
                              <span className="text-[10px] text-sky-600 font-bold uppercase flex items-center gap-1">
                                <ExternalLink className="h-2.5 w-2.5" /> Externa
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Target window */}
                        <td className="py-4 px-4 text-center">
                          {item.openInNewTab ? (
                            <Badge variant="outline" className="text-[10px] font-bold text-sky-600 border-sky-200 bg-sky-50">
                              Nueva Pestaña (_blank)
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-slate-400">Misma pestaña</span>
                          )}
                        </td>

                        {/* Active toggle */}
                        <td className="py-4 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(item.id)}
                            className={cn(
                              "rounded-xl px-2.5 py-1 text-xs font-bold transition-all",
                              item.isActive !== false
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                            )}
                          >
                            {item.isActive !== false ? (
                              <>
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                Visible
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3.5 w-3.5 mr-1" />
                                Oculto
                              </>
                            )}
                          </Button>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                              className="rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              title="Editar sección"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.id, item.label)}
                              className="rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              title="Eliminar del menú"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Modal / Dialog for Add / Edit Item */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center">
                      <Compass className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-base">
                        {editingId ? "Editar Sección del Menú" : "Añadir Nueva Sección"}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">Configura el nombre, enlace e icono público</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSaveModal} className="p-6 space-y-5 overflow-y-auto flex-1">
                  {/* Label / Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                      <span>Nombre o Etiqueta Visible *</span>
                      <span className="text-[10px] text-slate-400 font-normal">Ej: Inicio, Noticias, Cultura</span>
                    </label>
                    <Input
                      required
                      placeholder="Ej. Deportes, Revista, Galería..."
                      value={formLabel}
                      onChange={(e) => setFormLabel(e.target.value)}
                      className="rounded-2xl border-slate-200 text-sm font-bold"
                    />
                  </div>

                  {/* Path / URL */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                      <span>Ruta o Enlace de Destino *</span>
                      <span className="text-[10px] text-slate-400 font-normal">URL interna o externa</span>
                    </label>
                    <Input
                      required
                      placeholder="Ej. /noticias o /categoria/Deportes"
                      value={formPath}
                      onChange={(e) => setFormPath(e.target.value)}
                      className="rounded-2xl border-slate-200 text-sm font-mono"
                    />
                    
                    {/* Quick suggestion shortcuts */}
                    <div className="pt-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Sugerencias rápidas:</p>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => { setFormPath('/'); if (!formLabel) setFormLabel('Inicio'); setFormIcon('Globe'); }}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          / (Inicio)
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFormPath('/noticias'); if (!formLabel) setFormLabel('Noticias'); setFormIcon('Newspaper'); }}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          /noticias (Noticias)
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFormPath('/losanfitriones'); if (!formLabel) setFormLabel('Los Anfitriones'); setFormIcon('BookOpen'); }}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 transition-colors border border-sky-200"
                        >
                          /losanfitriones (Periódicos)
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFormPath('/periodico'); if (!formLabel) setFormLabel('Periódico'); setFormIcon('BookOpen'); }}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          /periodico (Periódico Digital)
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFormPath('/categoria/Videos'); if (!formLabel) setFormLabel('Videos'); setFormIcon('Video'); }}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          /categoria/Videos
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFormPath('/categoria/Facebook'); if (!formLabel) setFormLabel('Facebook'); setFormIcon('Facebook'); }}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          /categoria/Facebook
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2">
                        💡 Puedes usar rutas directas de sección (ej. <span className="font-mono text-slate-600 font-bold">/losanfitriones</span> o <span className="font-mono text-slate-600 font-bold">/categoria/Deportes</span>) o páginas fijas (<span className="font-mono text-slate-600 font-bold">/</span>, <span className="font-mono text-slate-600 font-bold">/noticias</span>, <span className="font-mono text-slate-600 font-bold">/periodico</span>).
                      </p>
                    </div>
                  </div>

                  {/* Icon & Position Row */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Icon Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700">Icono Decorativo</label>
                      <button
                        type="button"
                        onClick={() => setShowIconPicker(true)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl border border-slate-200 hover:border-brand-blue bg-white transition-all text-xs font-bold text-slate-800"
                      >
                        <div className="flex items-center gap-2">
                          {(() => {
                            const IconComponent = resolveCategoryIcon(formLabel, formIcon);
                            return <IconComponent className="h-4 w-4 text-brand-blue" />;
                          })()}
                          <span className="truncate">{formIcon || 'Seleccionar'}</span>
                        </div>
                        <Search className="h-3.5 w-3.5 text-slate-400" />
                      </button>
                    </div>

                    {/* Order / Position Number */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700">Orden / Posición</label>
                      <Input
                        type="number"
                        min="1"
                        value={formOrder}
                        onChange={(e) => setFormOrder(parseInt(e.target.value, 10) || 1)}
                        className="rounded-2xl border-slate-200 text-sm font-bold"
                      />
                    </div>
                  </div>

                  {/* Optional Badge */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                      <span>Badge / Etiqueta Opcional</span>
                      <span className="text-[10px] text-slate-400 font-normal">Ej: NUEVO, HOT, VIVO</span>
                    </label>
                    <Input
                      placeholder="Ej. NUEVO, PROMO, LIVE..."
                      value={formBadge}
                      onChange={(e) => setFormBadge(e.target.value)}
                      className="rounded-2xl border-slate-200 text-xs uppercase"
                    />
                  </div>

                  {/* Toggles */}
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/70 transition-colors cursor-pointer">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900">Visible en la barra de navegación</span>
                        <span className="text-[10px] text-slate-400">Si se desmarca, se ocultará temporalmente del sitio</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={formIsActive}
                        onChange={(e) => setFormIsActive(e.target.checked)}
                        className="h-4 w-4 rounded text-brand-blue focus:ring-brand-blue"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/70 transition-colors cursor-pointer">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900">Abrir en nueva pestaña</span>
                        <span className="text-[10px] text-slate-400">Útil para enlaces externos a redes sociales u otros sitios</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={formOpenInNewTab}
                        onChange={(e) => setFormOpenInNewTab(e.target.checked)}
                        className="h-4 w-4 rounded text-brand-blue focus:ring-brand-blue"
                      />
                    </label>
                  </div>

                  {/* Modal Footer Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-2xl text-slate-500 hover:bg-slate-100 text-xs font-bold"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider px-6 shadow-md shadow-slate-200"
                    >
                      {editingId ? "Actualizar Sección" : "Agregar Sección"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Icon Picker Sub-Modal */}
        <AnimatePresence>
          {showIconPicker && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
              >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h3 className="font-black text-slate-900 text-base">Seleccionar Icono</h3>
                    <p className="text-xs text-slate-400">Escoge el icono representativo para esta sección</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(false)}
                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Buscar icono por nombre o tema..."
                      value={iconSearch}
                      onChange={(e) => setIconSearch(e.target.value)}
                      className="pl-9 rounded-2xl border-slate-200 text-xs"
                      autoFocus
                    />
                  </div>

                  {/* Group filters */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px]">
                    {iconGroups.map((grp) => (
                      <button
                        key={grp}
                        type="button"
                        onClick={() => setIconGroup(grp)}
                        className={cn(
                          "px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-all",
                          iconGroup === grp
                            ? "bg-slate-900 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        {grp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icons Grid */}
                <div className="p-6 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {filteredIcons.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = formIcon === item.name;

                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          setFormIcon(item.name);
                          setShowIconPicker(false);
                          toast.success(`Icono "${item.label}" seleccionado`);
                        }}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all text-center group",
                          isSelected
                            ? "bg-brand-blue/10 border-brand-blue text-brand-blue shadow-sm"
                            : "border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-slate-600"
                        )}
                      >
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                          isSelected ? "bg-brand-blue text-white" : "bg-slate-100 text-slate-700"
                        )}>
                          <IconComp className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-bold truncate max-w-full leading-tight">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
