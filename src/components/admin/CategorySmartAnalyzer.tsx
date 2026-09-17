import React, { useState, useMemo } from 'react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import { Article, Category } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Sparkles, 
  Brain, 
  CheckSquare, 
  Square, 
  ArrowRight, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  FolderPlus, 
  Wand2
} from 'lucide-react';

// Semantic rules for domain categorization
interface CategoryRule {
  id: string;
  name: string;
  icon: string;
  description: string;
  keywords: { word: string; weight: number }[];
}

const DEFAULT_CATEGORY_RULES: CategoryRule[] = [
  {
    id: 'vitalfit',
    name: 'VITALfit',
    icon: 'Dumbbell',
    description: 'Fitness, acondicionamiento físico, gimnasio, pesas y vida saludable.',
    keywords: [
      { word: 'vitalfit', weight: 10 },
      { word: 'gym', weight: 8 },
      { word: 'pesas', weight: 8 },
      { word: 'fitness', weight: 8 },
      { word: 'ejercicio', weight: 7 },
      { word: 'rutina', weight: 6 },
      { word: 'entrenamiento', weight: 7 },
      { word: 'crossfit', weight: 8 },
      { word: 'cardio', weight: 7 },
      { word: 'músculo', weight: 6 },
      { word: 'musculo', weight: 6 },
      { word: 'bíceps', weight: 6 },
      { word: 'nutrición', weight: 6 },
      { word: 'nutricion', weight: 6 },
      { word: 'proteína', weight: 6 },
      { word: 'proteina', weight: 6 },
      { word: 'suplementos', weight: 6 },
      { word: 'vida saludable', weight: 7 },
      { word: 'salud física', weight: 7 },
      { word: 'maratón', weight: 6 },
      { word: 'carrera atlética', weight: 7 },
      { word: 'atletismo', weight: 5 }
    ]
  },
  {
    id: 'seguridad',
    name: 'Seguridad y Justicia',
    icon: 'ShieldAlert',
    description: 'Sucesos policiacos, vialidad, accidentes, emergencias y operativos.',
    keywords: [
      { word: 'choque', weight: 7 },
      { word: 'volcadura', weight: 8 },
      { word: 'accidente', weight: 7 },
      { word: 'patrulla', weight: 7 },
      { word: 'policía', weight: 7 },
      { word: 'policia', weight: 7 },
      { word: 'seguridad pública', weight: 8 },
      { word: 'fiscalía', weight: 8 },
      { word: 'fiscalia', weight: 8 },
      { word: 'peritos', weight: 8 },
      { word: 'vialidad', weight: 6 },
      { word: 'tránsito', weight: 6 },
      { word: 'detenido', weight: 7 },
      { word: 'detención', weight: 7 },
      { word: 'lesionado', weight: 7 },
      { word: 'lesionados', weight: 7 },
      { word: 'ambulancia', weight: 7 },
      { word: 'cruz roja', weight: 7 },
      { word: 'protección civil', weight: 7 },
      { word: 'bomberos', weight: 7 },
      { word: 'operativo', weight: 6 },
      { word: 'cateo', weight: 8 },
      { word: 'robo', weight: 7 },
      { word: 'asalto', weight: 7 },
      { word: 'homicidio', weight: 8 },
      { word: 'derrape', weight: 7 },
      { word: 'motociclista lesionado', weight: 9 }
    ]
  },
  {
    id: 'deportes',
    name: 'Deportes',
    icon: 'Trophy',
    description: 'Torneos locales, fútbol, canchas, atletas y competencias.',
    keywords: [
      { word: 'fútbol', weight: 8 },
      { word: 'futbol', weight: 8 },
      { word: 'soccer', weight: 8 },
      { word: 'torneo', weight: 7 },
      { word: 'campeonato', weight: 7 },
      { word: 'campeón', weight: 7 },
      { word: 'campeon', weight: 7 },
      { word: 'liga', weight: 6 },
      { word: 'estadio', weight: 6 },
      { word: 'cancha', weight: 6 },
      { word: 'partido', weight: 6 },
      { word: 'jugador', weight: 6 },
      { word: 'equipo', weight: 5 },
      { word: 'gol', weight: 7 },
      { word: 'básquetbol', weight: 8 },
      { word: 'voleibol', weight: 8 },
      { word: 'box', weight: 8 },
      { word: 'béisbol', weight: 8 },
      { word: 'beisbol', weight: 8 },
      { word: 'medalla', weight: 6 },
      { word: 'trofeo', weight: 6 }
    ]
  },
  {
    id: 'gobierno',
    name: 'Gobierno y Política',
    icon: 'Landmark',
    description: 'Cabildo, ayuntamiento, presidencia, iniciativas y obras públicas.',
    keywords: [
      { word: 'presidente municipal', weight: 9 },
      { word: 'alcaldesa', weight: 9 },
      { word: 'alcalde', weight: 9 },
      { word: 'ayuntamiento', weight: 8 },
      { word: 'sesión de cabildo', weight: 9 },
      { word: 'cabildo', weight: 8 },
      { word: 'regidor', weight: 8 },
      { word: 'regidores', weight: 8 },
      { word: 'síndico', weight: 8 },
      { word: 'palacio municipal', weight: 8 },
      { word: 'obras públicas', weight: 7 },
      { word: 'iniciativa', weight: 6 },
      { word: 'diputado', weight: 8 },
      { word: 'congreso', weight: 7 },
      { word: 'elecciones', weight: 7 },
      { word: 'gobierno', weight: 6 }
    ]
  },
  {
    id: 'cultura',
    name: 'Cultura y Tradición',
    icon: 'Palette',
    description: 'Fiestas tradicionales, feria, templos, arte, danza y música.',
    keywords: [
      { word: 'sonajeros', weight: 9 },
      { word: 'cuadrilla', weight: 8 },
      { word: 'fiesta patronal', weight: 9 },
      { word: 'santuario', weight: 8 },
      { word: 'catedral', weight: 8 },
      { word: 'feria', weight: 7 },
      { word: 'festival', weight: 7 },
      { word: 'danza', weight: 7 },
      { word: 'música', weight: 6 },
      { word: 'concierto', weight: 6 },
      { word: 'teatro', weight: 7 },
      { word: 'exposición', weight: 7 },
      { word: 'museo', weight: 7 },
      { word: 'arte', weight: 6 },
      { word: 'tradición', weight: 6 },
      { word: 'día de muertos', weight: 8 },
      { word: 'mariachi', weight: 7 }
    ]
  },
  {
    id: 'educacion',
    name: 'Educación y Ciencia',
    icon: 'GraduationCap',
    description: 'Universidades (CUSur, Tec), preparatorias, estudiantes y ciencia.',
    keywords: [
      { word: 'cusur', weight: 9 },
      { word: 'udg', weight: 9 },
      { word: 'tecnológico', weight: 8 },
      { word: 'tecnologico', weight: 8 },
      { word: 'universidad', weight: 7 },
      { word: 'escuela', weight: 7 },
      { word: 'alumnos', weight: 6 },
      { word: 'estudiantes', weight: 6 },
      { word: 'maestros', weight: 6 },
      { word: 'docentes', weight: 6 },
      { word: 'becas', weight: 7 },
      { word: 'graduación', weight: 7 },
      { word: 'taller', weight: 5 },
      { word: 'curso', weight: 5 }
    ]
  },
  {
    id: 'comunidad',
    name: 'Comunidad y Sociedad',
    icon: 'Users',
    description: 'Servicios de la ciudad, colonias, sapaza, agua, medio ambiente.',
    keywords: [
      { word: 'sapaza', weight: 9 },
      { word: 'agua potable', weight: 8 },
      { word: 'bacheo', weight: 8 },
      { word: 'alumbrado', weight: 7 },
      { word: 'vecinos', weight: 6 },
      { word: 'colonia', weight: 6 },
      { word: 'denuncia ciudadana', weight: 8 },
      { word: 'recolección de basura', weight: 8 },
      { word: 'medio ambiente', weight: 7 },
      { word: 'reforestación', weight: 7 },
      { word: 'mascotas', weight: 6 },
      { word: 'adopción', weight: 6 },
      { word: 'lluvias', weight: 6 },
      { word: 'clima', weight: 5 }
    ]
  },
  {
    id: 'economia',
    name: 'Economía y Negocios',
    icon: 'Building2',
    description: 'Comercio, empresas locales, tianguis, campo y productores.',
    keywords: [
      { word: 'comercio', weight: 7 },
      { word: 'tianguis', weight: 7 },
      { word: 'mercado', weight: 6 },
      { word: 'canaco', weight: 8 },
      { word: 'empresarios', weight: 7 },
      { word: 'empleo', weight: 7 },
      { word: 'aguacate', weight: 7 },
      { word: 'berries', weight: 7 },
      { word: 'campo', weight: 6 },
      { word: 'agricultura', weight: 6 },
      { word: 'economía', weight: 6 }
    ]
  }
];

interface AnalysisResultItem {
  article: Article;
  currentCategory: string;
  isGeneral: boolean;
  suggestedCategory: string;
  confidence: 'alta' | 'media' | 'baja';
  matchedKeywords: string[];
  score: number;
  selected: boolean;
}

interface CategorySmartAnalyzerProps {
  articles: Article[];
  categories: Category[];
  onRefreshCategories: () => void;
  onClose?: () => void;
}

export default function CategorySmartAnalyzer({
  articles,
  categories,
  onRefreshCategories,
  onClose
}: CategorySmartAnalyzerProps) {
  const [analyzed, setAnalyzed] = useState(false);
  const [items, setItems] = useState<AnalysisResultItem[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'general' | 'high_confidence'>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);

  // Available target category names from existing DB + Default Rules
  const allAvailableCategories = useMemo(() => {
    const list = new Set<string>();
    categories.forEach(c => list.add(c.name));
    DEFAULT_CATEGORY_RULES.forEach(r => list.add(r.name));
    return Array.from(list);
  }, [categories]);

  // Run the semantic analyzer over articles
  const handleRunAnalysis = () => {
    const toastId = toast.loading('Analizando títulos, descripciones y temáticas...');

    // Build comprehensive rules including existing DB categories
    const activeRules: CategoryRule[] = [...DEFAULT_CATEGORY_RULES];
    
    // Add existing DB categories as rules if not already present
    categories.forEach(cat => {
      const existing = activeRules.find(r => r.name.toLowerCase() === cat.name.toLowerCase());
      if (!existing && cat.name.toLowerCase() !== 'general' && cat.name.toLowerCase() !== 'noticias') {
        activeRules.push({
          id: cat.id,
          name: cat.name,
          icon: cat.icon || 'Newspaper',
          description: cat.description || `Categoría existente ${cat.name}`,
          keywords: [
            { word: cat.name.toLowerCase(), weight: 8 },
            ...((cat.subcategories || []).map(s => ({ word: s.toLowerCase(), weight: 6 })))
          ]
        });
      }
    });

    const results: AnalysisResultItem[] = articles.map((art) => {
      // Extract current category
      let currentCat = 'General';
      if (Array.isArray(art.categories) && art.categories.length > 0) {
        currentCat = art.categories[0];
      } else if (typeof art.categories === 'string' && art.categories) {
        currentCat = (art.categories as string).split(',')[0].trim();
      }

      const isGeneral = 
        !currentCat || 
        currentCat.toLowerCase() === 'general' || 
        currentCat.toLowerCase() === 'sin categoría' || 
        currentCat.toLowerCase() === 'noticias';

      // Full text to analyze
      const textToSearch = `${art.title || ''} ${art.summary || ''} ${art.content || ''}`.toLowerCase();
      const titleLower = (art.title || '').toLowerCase();

      let bestRule: CategoryRule | null = null;
      let highestScore = 0;
      let bestMatches: string[] = [];

      activeRules.forEach((rule) => {
        let ruleScore = 0;
        const matchedKw: string[] = [];

        rule.keywords.forEach(({ word, weight }) => {
          if (!word) return;
          // Check if word exists in title (triple weight)
          if (titleLower.includes(word)) {
            ruleScore += weight * 3;
            matchedKw.push(word);
          } else if (textToSearch.includes(word)) {
            ruleScore += weight;
            matchedKw.push(word);
          }
        });

        if (ruleScore > highestScore) {
          highestScore = ruleScore;
          bestRule = rule;
          bestMatches = matchedKw;
        }
      });

      // Determine confidence
      let confidence: 'alta' | 'media' | 'baja' = 'baja';
      if (highestScore >= 18) confidence = 'alta';
      else if (highestScore >= 8) confidence = 'media';

      const suggestedCategory = (bestRule && highestScore >= 7) ? (bestRule as CategoryRule).name : currentCat;
      const isReclassified = suggestedCategory !== currentCat;

      return {
        article: art,
        currentCategory: currentCat,
        isGeneral,
        suggestedCategory,
        confidence,
        matchedKeywords: Array.from(new Set(bestMatches)).slice(0, 4),
        score: highestScore,
        // Auto-select if currently general and we found a solid match
        selected: isGeneral && isReclassified && highestScore >= 7
      };
    });

    setItems(results);
    setAnalyzed(true);

    const reclassifiedCount = results.filter(r => r.selected).length;
    toast.success(`Análisis completado: ${results.length} notas procesadas. Se encontraron ${reclassifiedCount} notas listas para re-categorizar.`, { id: toastId });
  };

  // Filtered view
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Tab filter
      if (filterTab === 'general') {
        if (!item.isGeneral) return false;
      } else if (filterTab === 'high_confidence') {
        if (item.confidence !== 'alta') return false;
      }

      // Query search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (item.article.title || '').toLowerCase().includes(q);
        const matchesCat = item.currentCategory.toLowerCase().includes(q) || item.suggestedCategory.toLowerCase().includes(q);
        const matchesKw = item.matchedKeywords.some(k => k.toLowerCase().includes(q));
        return matchesTitle || matchesCat || matchesKw;
      }

      return true;
    });
  }, [items, filterTab, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = items.length;
    const generalCount = items.filter(i => i.isGeneral).length;
    const selectedCount = items.filter(i => i.selected).length;
    const highConfidenceCount = items.filter(i => i.confidence === 'alta').length;

    // Detect which recommended categories don't exist in DB yet
    const missingCats: { name: string; icon: string; count: number }[] = [];
    DEFAULT_CATEGORY_RULES.forEach(rule => {
      const existsInDb = categories.some(c => c.name.toLowerCase() === rule.name.toLowerCase());
      if (!existsInDb) {
        const count = items.filter(i => i.suggestedCategory === rule.name && i.selected).length;
        if (count > 0) {
          missingCats.push({ name: rule.name, icon: rule.icon, count });
        }
      }
    });

    return { total, generalCount, selectedCount, highConfidenceCount, missingCats };
  }, [items, categories]);

  // Toggle selection for single item
  const handleToggleSelect = (index: number) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], selected: !updated[index].selected };
      return updated;
    });
  };

  // Toggle all filtered
  const handleSelectAllFiltered = (selectAll: boolean) => {
    const filteredIds = new Set(filteredItems.map(i => i.article.id));
    setItems(prev => prev.map(item => {
      if (filteredIds.has(item.article.id)) {
        return { ...item, selected: selectAll };
      }
      return item;
    }));
  };

  // Change suggested category for single item
  const handleChangeSuggestedCat = (articleId: string, newCat: string) => {
    setItems(prev => prev.map(item => {
      if (item.article.id === articleId) {
        return {
          ...item,
          suggestedCategory: newCat,
          selected: true
        };
      }
      return item;
    }));
  };

  // Auto-create missing categories in DB
  const handleCreateMissingCategories = async () => {
    if (stats.missingCats.length === 0) return;
    const toastId = toast.loading('Creando categorías faltantes en la base de datos...');

    try {
      const batch = writeBatch(db);
      stats.missingCats.forEach(({ name, icon }) => {
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const catRef = doc(db, 'categories', id);
        batch.set(catRef, {
          name,
          icon,
          description: `Categoría creada automáticamente por el Analizador Inteligente`,
          subcategories: []
        });
      });

      await batch.commit();
      toast.success(`Se crearon ${stats.missingCats.length} categorías nuevas.`, { id: toastId });
      onRefreshCategories();
    } catch (err) {
      console.error(err);
      toast.error('Error al crear las categorías.', { id: toastId });
    }
  };

  // Apply batch re-classification to Firestore
  const handleApplyBatchReclassification = async () => {
    const selectedItems = items.filter(i => i.selected && i.suggestedCategory && i.suggestedCategory !== i.currentCategory);
    if (selectedItems.length === 0) {
      toast.info('No hay notas seleccionadas con cambios de categoría.');
      return;
    }

    if (!window.confirm(`¿Confirmas que deseas re-categorizar ${selectedItems.length} notas seleccionadas en la base de datos?`)) {
      return;
    }

    setIsUpdating(true);
    setUpdateProgress(0);
    const toastId = toast.loading(`Actualizando ${selectedItems.length} notas en lote...`);

    try {
      // Chunk into batches of 400 (Firestore limit is 500)
      const chunkSize = 400;
      for (let i = 0; i < selectedItems.length; i += chunkSize) {
        const chunk = selectedItems.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach(item => {
          const artRef = doc(db, 'articles', item.article.id);
          
          // Preserve secondary categories like "Videos" if present
          let newCategories = [item.suggestedCategory];
          if (Array.isArray(item.article.categories)) {
            const preserved = item.article.categories.filter(c => 
              c.toLowerCase() === 'videos' || c.toLowerCase() === 'facebook'
            );
            newCategories = Array.from(new Set([...newCategories, ...preserved]));
          }

          batch.update(artRef, {
            categories: newCategories
          });
        });

        await batch.commit();
        const progress = Math.round(((i + chunk.length) / selectedItems.length) * 100);
        setUpdateProgress(progress);
      }

      toast.success(`¡Éxito! ${selectedItems.length} notas fueron reclasificadas correctamente.`, { id: toastId });
      
      // Update local state to reflect changes
      setItems(prev => prev.map(item => {
        if (item.selected && item.suggestedCategory) {
          return {
            ...item,
            currentCategory: item.suggestedCategory,
            isGeneral: false,
            selected: false
          };
        }
        return item;
      }));

      onRefreshCategories();
    } catch (error) {
      console.error(error);
      toast.error('Ocurrió un error al aplicar la actualización masiva.', { id: toastId });
    } finally {
      setIsUpdating(false);
      setUpdateProgress(0);
    }
  };

  return (
    <Card className="border border-slate-200/80 shadow-md bg-white rounded-3xl overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Brain className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              Motor Semántico
            </span>
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight text-white">
            Analizador Inteligente de Contenido y Categorías
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl font-medium">
            Examina títulos y contenido de tus notas para detectar temáticas clave (fitness en VITALfit, seguridad, deportes, cultura, etc.) y re-ubicarlas en lote para que no se queden todas en General.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            onClick={handleRunAnalysis}
            disabled={isUpdating}
            className="rounded-xl bg-[#00AEEF] hover:bg-[#0098d4] text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 shadow-md shadow-[#00AEEF]/20 cursor-pointer"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {analyzed ? 'Re-analizar Notas' : 'Iniciar Análisis'}
          </Button>
          {onClose && (
            <Button
              onClick={onClose}
              variant="outline"
              className="rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 text-xs font-bold"
            >
              Cerrar
            </Button>
          )}
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        {!analyzed ? (
          <div className="text-center py-12 px-4 space-y-4 max-w-md mx-auto">
            <div className="h-16 w-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
              <Wand2 className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black uppercase text-slate-900 tracking-tight">Listo para Escanear</h3>
              <p className="text-xs text-slate-500 font-medium">
                Haz clic en <strong>"Iniciar Análisis"</strong> para procesar las {articles.length} notas publicadas y generar recomendaciones de categorías.
              </p>
            </div>
            <Button
              onClick={handleRunAnalysis}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider px-6 py-2.5"
            >
              Comenzar Escaneo ({articles.length} notas)
            </Button>
          </div>
        ) : (
          <>
            {/* Health & Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Analizadas</span>
                <p className="text-2xl font-black text-slate-900">{stats.total}</p>
                <p className="text-[10px] text-slate-500 font-medium">Artículos en base de datos</p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> En General / Sin Cat.
                </span>
                <p className="text-2xl font-black text-amber-900">{stats.generalCount}</p>
                <p className="text-[10px] text-amber-700/80 font-medium">Requieren acomodarse</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Alta Certeza
                </span>
                <p className="text-2xl font-black text-emerald-900">{stats.highConfidenceCount}</p>
                <p className="text-[10px] text-emerald-700/80 font-medium">Coincidencia temática clara</p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">Seleccionadas</span>
                <p className="text-2xl font-black text-blue-900">{stats.selectedCount}</p>
                <p className="text-[10px] text-blue-700/80 font-medium">Listas para guardar en lote</p>
              </div>
            </div>

            {/* Auto-create missing categories callout */}
            {stats.missingCats.length > 0 && (
              <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-900">
                    <FolderPlus className="h-4 w-4 text-indigo-600" />
                    <span>Se detectaron categorías recomendadas aún no creadas en el sistema:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {stats.missingCats.map(cat => (
                      <Badge key={cat.name} variant="outline" className="bg-white border-indigo-200 text-indigo-800 text-[10px] font-bold">
                        {cat.name} ({cat.count} notas afines)
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={handleCreateMissingCategories}
                  size="sm"
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shrink-0 cursor-pointer"
                >
                  Crear {stats.missingCats.length} Categorías en BD
                </Button>
              </div>
            )}

            {/* Actions Bar & Filter Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setFilterTab('general')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    filterTab === 'general' 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  En General ({stats.generalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('high_confidence')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    filterTab === 'high_confidence' 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Alta Certeza ({stats.highConfidenceCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    filterTab === 'all' 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todas ({stats.total})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Filtrar por título o tema..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-8 text-xs font-medium rounded-xl border-slate-200 bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* Selection & Batch Action Trigger */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100/80 border border-slate-200 text-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectAllFiltered(true)}
                  className="text-[11px] font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1 cursor-pointer"
                >
                  <CheckSquare className="h-3.5 w-3.5 text-slate-600" /> Seleccionar Visibles
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => handleSelectAllFiltered(false)}
                  className="text-[11px] font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1 cursor-pointer"
                >
                  <Square className="h-3.5 w-3.5 text-slate-400" /> Desmarcar Visibles
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-slate-600">
                  {stats.selectedCount} seleccionadas para reclasificar
                </span>
                <Button
                  onClick={handleApplyBatchReclassification}
                  disabled={isUpdating || stats.selectedCount === 0}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider px-4 py-2 shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Aplicar en Lote
                </Button>
              </div>
            </div>

            {/* Progress Bar when updating */}
            {isUpdating && (
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-indigo-900 uppercase">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
                    Actualizando artículos en Firestore...
                  </span>
                  <span>{updateProgress}%</span>
                </div>
                <div className="w-full bg-indigo-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${updateProgress}%` }} 
                  />
                </div>
              </div>
            )}

            {/* Table of Articles */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400 font-medium">
                    No se encontraron notas en esta vista.
                  </div>
                ) : (
                  filteredItems.map((item, idx) => {
                    return (
                      <div
                        key={item.article.id}
                        className={`p-3.5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                          item.selected ? 'bg-blue-50/40' : 'bg-white hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Left Checkbox & Title */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => handleToggleSelect(idx)}
                            className="mt-1 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                          />
                          <div className="space-y-1 min-w-0">
                            <h4 className="text-xs font-black text-slate-900 line-clamp-1">
                              {item.article.title}
                            </h4>
                            {item.matchedKeywords.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                  Detectado:
                                </span>
                                {item.matchedKeywords.map((kw) => (
                                  <span
                                    key={kw}
                                    className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200"
                                  >
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Middle & Right: Current -> Suggested */}
                        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                          {/* Current Category */}
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              item.isGeneral
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {item.currentCategory}
                          </Badge>

                          <ArrowRight className="h-3 w-3 text-slate-300" />

                          {/* Suggested Category with Dropdown to fine-tune */}
                          <select
                            value={item.suggestedCategory}
                            onChange={(e) => handleChangeSuggestedCat(item.article.id, e.target.value)}
                            className="h-7 px-2 text-[11px] font-black rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                          >
                            {allAvailableCategories.map((catName) => (
                              <option key={catName} value={catName}>
                                {catName}
                              </option>
                            ))}
                          </select>

                          {/* Confidence Tag */}
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                              item.confidence === 'alta'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.confidence === 'media'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.confidence === 'alta' ? 'Alta Afinidad' : item.confidence === 'media' ? 'Media' : 'Baja'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
