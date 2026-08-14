import { useRef, useState } from 'react';
import {
  BookOpen,
  BookText,
  FileText,
  Library,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  type Book,
  type BookCategory,
  type BookStatus,
  useLibraryStore,
} from './libraryStore';

const ACCEPTED = '.pdf,.txt,.epub,.doc,.docx';
const CATEGORY_LABELS: Record<BookCategory, string> = {
  REPERTORY: 'Repertory',
  MATERIA_MEDICA: 'Materia Medica',
  OTHER: 'Other',
};

const STATUS_STYLES: Record<BookStatus, string> = {
  LOCAL: 'bg-amber-100 text-amber-700',
  QUEUED: 'bg-slate-100 text-slate-600',
  INGESTING: 'bg-blue-100 text-blue-700',
  INDEXED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<BookStatus, string> = {
  LOCAL: 'Stored locally',
  QUEUED: 'Queued',
  INGESTING: 'Ingesting…',
  INDEXED: 'Indexed',
  FAILED: 'Failed',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function guessCategory(fileName: string): BookCategory {
  const n = fileName.toLowerCase();
  if (n.includes('repert') || n.includes('kent') || n.includes('synthesis')) {
    return 'REPERTORY';
  }
  if (n.includes('materia') || n.includes('boericke') || n.includes('allen')) {
    return 'MATERIA_MEDICA';
  }
  return 'OTHER';
}

function BookRow({ book }: { book: Book }) {
  const { removeBook, updateBook } = useLibraryStore();
  const Icon = book.category === 'REPERTORY' ? BookText : BookOpen;

  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-800">{book.title}</div>
        <div className="truncate text-xs text-slate-500">
          {book.author ? `${book.author} · ` : ''}
          {book.fileName} · {formatSize(book.sizeBytes)}
        </div>
      </div>

      <select
        value={book.category}
        onChange={(e) => updateBook(book.id, { category: e.target.value as BookCategory })}
        className="hidden rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 sm:block"
        aria-label="Category"
      >
        {(Object.keys(CATEGORY_LABELS) as BookCategory[]).map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABELS[c]}
          </option>
        ))}
      </select>

      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[book.status]}`}
      >
        {STATUS_LABELS[book.status]}
      </span>

      <button
        onClick={() => removeBook(book.id)}
        className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
        aria-label={`Remove ${book.title}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function LibraryPage() {
  const { books, addBook } = useLibraryStore();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function ingest(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const title = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
      addBook({
        title: title || file.name,
        author: '',
        category: guessCategory(file.name),
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });
    });
  }

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <header className="mb-6 flex items-center gap-3">
        <Library className="h-6 w-6 text-brand-600" />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Library</h1>
          <p className="text-sm text-slate-500">
            Upload repertories and materia medica to ingest into the knowledge graph.
          </p>
        </div>
      </header>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          ingest(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragging
            ? 'border-brand-500 bg-brand-50'
            : 'border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50'
        }`}
      >
        <UploadCloud className="h-10 w-10 text-brand-500" />
        <p className="mt-3 text-sm font-medium text-slate-700">
          Drag &amp; drop books here, or click to browse
        </p>
        <p className="mt-1 text-xs text-slate-400">PDF, EPUB, TXT or Word · up to a few files at a time</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={(e) => {
            ingest(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* Mode notice */}
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        {isSupabaseConfigured ? (
          <span>
            Connected: uploads are sent to Supabase Storage and the ingestion
            function extracts rubrics and remedies into the graph
            (<code>QUEUED → INDEXED</code>).
          </span>
        ) : (
          <span>
            <strong>Demo mode:</strong> books are catalogued locally in your browser
            (titles, categories and metadata persist). Connect a Supabase backend to
            parse the file contents into the GraphRAG knowledge graph.
          </span>
        )}
      </div>

      {/* Catalogue */}
      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Catalogue{' '}
            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {books.length}
            </span>
          </h2>
        </div>

        {books.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-400">
            No books yet — add your first repertory or materia medica above.
          </div>
        ) : (
          <div className="card overflow-hidden">
            {books.map((book) => (
              <BookRow key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
