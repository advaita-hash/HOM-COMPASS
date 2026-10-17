import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BookCategory = 'REPERTORY' | 'MATERIA_MEDICA' | 'OTHER';

/**
 * Ingestion lifecycle. In demo mode a book stays `LOCAL` — metadata is kept in
 * the browser but the file is not parsed into the knowledge graph. With a
 * Supabase backend the ingestion edge function drives QUEUED → INDEXED.
 */
export type BookStatus = 'LOCAL' | 'QUEUED' | 'INGESTING' | 'INDEXED' | 'FAILED';

export interface Book {
  id: string;
  title: string;
  author: string;
  category: BookCategory;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: BookStatus;
  addedAt: string;
  /** Populated once the ingestion pipeline extracts rubric/remedy nodes. */
  nodeCount?: number;
}

export interface NewBookInput {
  title: string;
  author: string;
  category: BookCategory;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

interface LibraryState {
  books: Book[];
  addBook: (input: NewBookInput) => Book;
  removeBook: (id: string) => void;
  updateBook: (id: string, patch: Partial<Book>) => void;
}

/** Small unique id without external deps (crypto when available). */
function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `book_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      books: [],
      addBook: (input) => {
        const book: Book = {
          id: makeId(),
          status: 'LOCAL',
          addedAt: new Date().toISOString(),
          ...input,
        };
        set({ books: [book, ...get().books] });
        return book;
      },
      removeBook: (id) => set({ books: get().books.filter((b) => b.id !== id) }),
      updateBook: (id, patch) =>
        set({
          books: get().books.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        }),
    }),
    { name: 'hom-compass.library' },
  ),
);
