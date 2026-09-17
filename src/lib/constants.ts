import { 
  Newspaper, 
  Palmtree, 
  Trophy, 
  HeartPulse, 
  GraduationCap, 
  MessageSquare, 
  FileText, 
  BookOpen, 
  Cpu, 
  Zap, 
  Globe, 
  Camera, 
  Music, 
  Utensils, 
  Briefcase,
  ShieldCheck,
  Facebook,
  Youtube,
  Dumbbell,
  BicepsFlexed,
  Flame,
  Activity,
  Bike,
  Footprints,
  Apple,
  Timer,
  Scale,
  Compass,
  MapPin,
  School,
  Quote,
  Laptop,
  Smartphone,
  Sparkles,
  Film,
  Tv,
  Headphones,
  Radio,
  Mic,
  Video,
  Coffee,
  TrendingUp,
  DollarSign,
  Building2,
  Siren,
  AlertTriangle,
  Sun,
  CloudSun,
  Instagram,
  Twitter,
  Car,
  Plane,
  Leaf
} from 'lucide-react';

export interface SelectableIconItem {
  name: string;
  label: string;
  group: 'Gym & Fitness' | 'Noticias & Editorial' | 'Salud & Vida' | 'Deportes & Ocio' | 'Cultura & Arte' | 'Tecnología & Negocios' | 'Redes Sociales' | 'Otros';
  icon: any;
}

export const CATEGORY_ICON_MAP: Record<string, any> = {
  Dumbbell,
  BicepsFlexed,
  Flame,
  Activity,
  Bike,
  Footprints,
  HeartPulse,
  Trophy,
  Apple,
  Timer,
  Scale,
  Newspaper,
  FileText,
  BookOpen,
  Palmtree,
  Compass,
  MapPin,
  GraduationCap,
  School,
  MessageSquare,
  Quote,
  Cpu,
  Laptop,
  Smartphone,
  Sparkles,
  Zap,
  Film,
  Tv,
  Music,
  Headphones,
  Radio,
  Mic,
  Camera,
  Video,
  Utensils,
  Coffee,
  Briefcase,
  TrendingUp,
  DollarSign,
  Building2,
  ShieldCheck,
  Siren,
  AlertTriangle,
  Sun,
  CloudSun,
  Facebook,
  Youtube,
  Instagram,
  Twitter,
  Car,
  Plane,
  Leaf
};

export const SELECTABLE_ICONS: SelectableIconItem[] = [
  // Gym & Fitness
  { name: 'Dumbbell', label: 'Pesas / Mancuerna (Gym)', group: 'Gym & Fitness', icon: Dumbbell },
  { name: 'BicepsFlexed', label: 'Fuerza / Músculo', group: 'Gym & Fitness', icon: BicepsFlexed },
  { name: 'Flame', label: 'Fuego / Calorías', group: 'Gym & Fitness', icon: Flame },
  { name: 'Activity', label: 'Actividad / Ritmo', group: 'Gym & Fitness', icon: Activity },
  { name: 'Bike', label: 'Bicicleta / Spinning', group: 'Gym & Fitness', icon: Bike },
  { name: 'Footprints', label: 'Pasos / Running', group: 'Gym & Fitness', icon: Footprints },
  { name: 'Timer', label: 'Cronómetro / Rutinas', group: 'Gym & Fitness', icon: Timer },
  { name: 'Apple', label: 'Nutrición Fitness', group: 'Gym & Fitness', icon: Apple },
  { name: 'Scale', label: 'Báscula / Peso', group: 'Gym & Fitness', icon: Scale },

  // Deportes & Ocio
  { name: 'Trophy', label: 'Trofeo / Deportes', group: 'Deportes & Ocio', icon: Trophy },
  { name: 'Palmtree', label: 'Palmera / Vacaciones', group: 'Deportes & Ocio', icon: Palmtree },
  { name: 'Compass', label: 'Brújula / Turismo', group: 'Deportes & Ocio', icon: Compass },
  { name: 'MapPin', label: 'Ubicación / Lugares', group: 'Deportes & Ocio', icon: MapPin },

  // Salud & Vida
  { name: 'HeartPulse', label: 'Corazón / Salud', group: 'Salud & Vida', icon: HeartPulse },
  { name: 'Leaf', label: 'Ecología / Naturaleza', group: 'Salud & Vida', icon: Leaf },
  { name: 'Sun', label: 'Sol / Bienestar', group: 'Salud & Vida', icon: Sun },
  { name: 'CloudSun', label: 'Clima / Tiempo', group: 'Salud & Vida', icon: CloudSun },

  // Noticias & Editorial
  { name: 'Newspaper', label: 'Periódico / Noticias', group: 'Noticias & Editorial', icon: Newspaper },
  { name: 'FileText', label: 'Reportaje / Nota', group: 'Noticias & Editorial', icon: FileText },
  { name: 'BookOpen', label: 'Revista / Lectura', group: 'Noticias & Editorial', icon: BookOpen },
  { name: 'GraduationCap', label: 'Educación', group: 'Noticias & Editorial', icon: GraduationCap },
  { name: 'School', label: 'Escuela / Comunidad', group: 'Noticias & Editorial', icon: School },
  { name: 'MessageSquare', label: 'Opinión / Diálogo', group: 'Noticias & Editorial', icon: MessageSquare },
  { name: 'Quote', label: 'Cita / Columna', group: 'Noticias & Editorial', icon: Quote },

  // Cultura, Arte & Entretenimiento
  { name: 'Sparkles', label: 'Destacado / Glamour', group: 'Cultura & Arte', icon: Sparkles },
  { name: 'Film', label: 'Cine / Espectáculos', group: 'Cultura & Arte', icon: Film },
  { name: 'Tv', label: 'Televisión / Farándula', group: 'Cultura & Arte', icon: Tv },
  { name: 'Music', label: 'Música / Conciertos', group: 'Cultura & Arte', icon: Music },
  { name: 'Headphones', label: 'Podcast / Audio', group: 'Cultura & Arte', icon: Headphones },
  { name: 'Mic', label: 'Micrófono / Entrevistas', group: 'Cultura & Arte', icon: Mic },
  { name: 'Camera', label: 'Fotografía / Galería', group: 'Cultura & Arte', icon: Camera },
  { name: 'Video', label: 'Video / Reportaje audiovisual', group: 'Cultura & Arte', icon: Video },
  { name: 'Utensils', label: 'Gastronomía / Cocina', group: 'Cultura & Arte', icon: Utensils },
  { name: 'Coffee', label: 'Café / Conversaciones', group: 'Cultura & Arte', icon: Coffee },

  // Tecnología & Negocios
  { name: 'Cpu', label: 'Tecnología / Procesador', group: 'Tecnología & Negocios', icon: Cpu },
  { name: 'Laptop', label: 'Computación / Digital', group: 'Tecnología & Negocios', icon: Laptop },
  { name: 'Smartphone', label: 'Móvil / Celulares', group: 'Tecnología & Negocios', icon: Smartphone },
  { name: 'Zap', label: 'Energía / Innovación', group: 'Tecnología & Negocios', icon: Zap },
  { name: 'Briefcase', label: 'Negocios / Empresas', group: 'Tecnología & Negocios', icon: Briefcase },
  { name: 'TrendingUp', label: 'Economía / Finanzas', group: 'Tecnología & Negocios', icon: TrendingUp },
  { name: 'DollarSign', label: 'Dinero / Comercio', group: 'Tecnología & Negocios', icon: DollarSign },
  { name: 'Building2', label: 'Gobierno / H. Ayuntamientos', group: 'Tecnología & Negocios', icon: Building2 },

  // Seguridad & Comunidad
  { name: 'ShieldCheck', label: 'Seguridad / Oficial', group: 'Otros', icon: ShieldCheck },
  { name: 'Siren', label: 'Policiaca / Emergencias', group: 'Otros', icon: Siren },
  { name: 'AlertTriangle', label: 'Alerta / Urgente', group: 'Otros', icon: AlertTriangle },
  { name: 'Car', label: 'Autos / Tránsito', group: 'Otros', icon: Car },
  { name: 'Plane', label: 'Vuelos / Viajes', group: 'Otros', icon: Plane },

  // Redes
  { name: 'Facebook', label: 'Facebook', group: 'Redes Sociales', icon: Facebook },
  { name: 'Youtube', label: 'YouTube', group: 'Redes Sociales', icon: Youtube },
  { name: 'Instagram', label: 'Instagram', group: 'Redes Sociales', icon: Instagram },
  { name: 'Twitter', label: 'X / Twitter', group: 'Redes Sociales', icon: Twitter },
];

export const CATEGORY_ICONS: Record<string, any> = {
  'General': Newspaper,
  'Noticias': Newspaper,
  'Cultura': Palmtree,
  'Deportes': Trophy,
  'Salud': HeartPulse,
  'VITALfit': Dumbbell,
  'Vitalfit': Dumbbell,
  'vitalfit': Dumbbell,
  'VitalFit': Dumbbell,
  'Gym': Dumbbell,
  'Fitness': Dumbbell,
  'Ejercicio': Dumbbell,
  'Ejercicios': Dumbbell,
  'Educación': GraduationCap,
  'Opinión': MessageSquare,
  'Reportajes': FileText,
  'Revista': BookOpen,
  'Tecnología': Cpu,
  'Entretenimiento': Zap,
  'Mundo': Globe,
  'Fotografía': Camera,
  'Música': Music,
  'Gastronomía': Utensils,
  'Negocios': Briefcase,
  'Local': Newspaper,
  'Policiaca': ShieldCheck,
  'Clima': Zap,
  'Videos': Youtube,
  'Facebook': Facebook,
};

/**
 * Resolves an icon component for a category.
 * Prioritizes custom icon name stored in category document, then built-in name match, then Newspaper fallback.
 */
export function resolveCategoryIcon(categoryName: string, customIconName?: string): any {
  if (customIconName && CATEGORY_ICON_MAP[customIconName]) {
    return CATEGORY_ICON_MAP[customIconName];
  }

  const cleanName = (categoryName || '').trim();
  if (CATEGORY_ICONS[cleanName]) {
    return CATEGORY_ICONS[cleanName];
  }

  const lower = cleanName.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (key.toLowerCase() === lower) {
      return icon;
    }
  }

  return Newspaper;
}

export const DEFAULT_CATEGORIES = [
  'General',
  'Noticias',
  'Facebook',
  'Videos',
  'Cultura',
  'Deportes',
  'VITALfit',
  'Salud',
  'Educación',
  'Opinión',
  'Reportajes',
  'Revista',
  'Tecnología',
  'Entretenimiento',
  'Mundo',
  'Fotografía',
  'Música',
  'Gastronomía',
  'Negocios'
];
