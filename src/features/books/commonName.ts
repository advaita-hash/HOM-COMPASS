import type { BookData, BookRemedy } from './types';
import { findBookRemedy } from './booksIndex';

/**
 * A short, presentable common name ("Wind-Flower", "Tartar Emetic"), or null
 * when the source field is parse debris. Keeps the first clause only and
 * repairs OCR-split compounds ("Wind-F lower" → "Wind-Flower").
 */
export function cleanCommonName(raw?: string | null): string | null {
  if (!raw) return null;
  let s = raw.replace(/[“”"]/g, '').trim();
  // first clause — but don't cut after abbreviations ("St. Ignatius Bean")
  s = s.split(/(?<!\b(?:St|Ste|Dr|Mt|Ft))\.\s|\s—\s|;\s/)[0].trim().replace(/[.,;:]+$/, '');
  s = s.replace(/-([A-Z]) ([a-z])/g, '-$1$2');
  if (!/^[A-Z(]/.test(s) || s.length > 40) return null;
  return s;
}

/**
 * Common name for a remedy in any book. Boericke's and Allen's fields are
 * reliable; Tyler's is mostly fragments, so it borrows Boericke's name (as
 * Allen does when his entry has none).
 */
export function commonNameFor(book: string, remedy: BookRemedy, boericke?: BookData): string | null {
  if (book === 'boericke') return cleanCommonName(remedy.commonName);
  if (book === 'allen') {
    const own = cleanCommonName(remedy.commonName);
    if (own) return own;
  }
  const b = boericke ? findBookRemedy(boericke, remedy.name) : undefined;
  return cleanCommonName(b?.commonName);
}
