import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/firebase';

/**
 * Convierte un texto a un slug URL amigable (sin acentos, en minúsculas, separado por guiones).
 */
export function cleanSlug(text: string): string {
  const cleaned = (text || '')
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'revista';
}

/**
 * Comprueba si un slug ya está en uso en la colección de flipbooks.
 * Si se pasa excludeDocId, se ignora ese documento (útil al editar).
 */
export async function isMagazineSlugTaken(slug: string, excludeDocId?: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'flipbooks'),
      where('slug', '==', slug),
      limit(2)
    );
    const snap = await getDocs(q);
    if (snap.empty) return false;
    if (!excludeDocId) return true;
    return snap.docs.some(docSnap => docSnap.id !== excludeDocId);
  } catch (err) {
    console.error("Error al comprobar slug:", err);
    return false;
  }
}

/**
 * Genera un slug único para una revista:
 * - Toma principalmente el título limpio (ej: "edicion-3-2025")
 * - Si hay conflicto, agrega un sufijo de 2 dígitos al final (ej: "edicion-3-2025-01", "edicion-3-2025-02")
 */
export async function generateUniqueMagazineSlug(title: string, excludeDocId?: string): Promise<string> {
  const baseSlug = cleanSlug(title);
  const alreadyTaken = await isMagazineSlugTaken(baseSlug, excludeDocId);
  
  if (!alreadyTaken) {
    return baseSlug;
  }

  // Si hay conflicto, buscar el primer sufijo de 2 dígitos libre: -01, -02, etc.
  for (let i = 1; i <= 99; i++) {
    const suffix = i.toString().padStart(2, '0');
    const candidate = `${baseSlug}-${suffix}`;
    const taken = await isMagazineSlugTaken(candidate, excludeDocId);
    if (!taken) {
      return candidate;
    }
  }

  // Fallback si todos los 99 están ocupados
  return `${baseSlug}-${Math.floor(10 + Math.random() * 90)}`;
}
