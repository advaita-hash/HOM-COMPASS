import { type FormEvent, type ReactNode, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpenText, Crown, Loader2, Sparkles } from 'lucide-react';
import { DISCLAIMER } from '../../components/ClinicalDisclaimer';
import { usePageTour } from '../tour/usePageTour';
import { TourButton } from '../tour/TourButton';
import { FREE_DAILY, freeLeft, useAsk } from './askStore';

interface SourceDoc {
  book: string;
  label: string;
  slug: string;
  name: string;
  /** "i.j:a-b" places of the lines sent, in order (citation block indexes point here). */
  lines: string[];
}
interface Cite {
  doc: number;
  start: number;
  end: number;
  text: string;
}

const EXAMPLES = ['Compare Apis and Apocynum in dropsy', 'Drug picture of Alumina', 'Baptisia in fever'];

const MESSAGES: Record<string, string> = {
  limit: `You've used your ${FREE_DAILY} free questions for today. They come back at midnight; premium questions are unlimited.`,
  'not-configured': 'The assistant isn’t switched on yet. Please try again later.',
  'no-passages': 'None of the books in your plan has a chapter or line about this. Try naming the remedies, e.g. “Compare Apis and Apocynum in dropsy”.',
  'bad-question': 'Please ask a question of 3 to 600 characters.',
  busy: 'The assistant is busy right now. Please try again in a minute.',
  failed: 'Something went wrong while answering. Please try again.',
  network: 'Couldn’t reach the assistant. Check your connection and try again.',
  'bad-code': 'Your premium code wasn’t accepted, so this is a free answer. Check the code or ask for a new one.',
};

export default function AskPage() {
  usePageTour('ask');
  const { code, setCode, countFreeQuestion } = useAsk();
  const left = useAsk(freeLeft);
  const premium = code !== '';
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refused, setRefused] = useState(false);
  const [tier, setTier] = useState<'free' | 'premium' | null>(null);
  const [docs, setDocs] = useState<SourceDoc[]>([]);
  const [blocks, setBlocks] = useState<Record<number, { text: string; cites: Cite[] }>>({});
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeDraft, setCodeDraft] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  async function ask(q: string) {
    if (!q.trim() || busy) return;
    if (!premium && left <= 0) return setError('limit');
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setAsked(q.trim());
    setBusy(true);
    setError(null);
    setRefused(false);
    setDocs([]);
    setBlocks({});
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: q.trim(), code }),
        signal: ac.signal,
      });
      if (!res.ok || !res.headers.get('content-type')?.includes('ndjson')) {
        const body = await res.json().catch(() => ({}));
        if (body.tier) setTier(body.tier);
        setError(body.error ?? 'failed');
        return;
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const e = JSON.parse(line);
          if (e.t === 'sources') {
            setTier(e.tier);
            setDocs(e.docs);
            if (e.tier === 'free') countFreeQuestion();
            if (e.tier === 'free' && code) setError('bad-code');
          } else if (e.t === 'text')
            setBlocks((b) => ({ ...b, [e.i]: { text: (b[e.i]?.text ?? '') + e.d, cites: b[e.i]?.cites ?? [] } }));
          else if (e.t === 'cite')
            setBlocks((b) => ({ ...b, [e.i]: { text: b[e.i]?.text ?? '', cites: [...(b[e.i]?.cites ?? []), e.c] } }));
          else if (e.t === 'done') setRefused(!!e.refused);
          else if (e.t === 'error') setError(e.code);
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError('network');
    } finally {
      if (abortRef.current === ac) setBusy(false);
    }
  }

  // numbered sources, in order of first citation; markers appended to the cited text
  const { markdown, sources } = useMemo(() => {
    const index = new Map<string, number>();
    const list: { n: number; doc: SourceDoc; cite: Cite }[] = [];
    let md = '';
    for (const k of Object.keys(blocks).map(Number).sort((a, b) => a - b)) {
      const { text, cites } = blocks[k];
      const marks = new Set<number>();
      for (const c of cites) {
        const doc = docs[c.doc];
        if (!doc) continue;
        const key = `${c.doc}:${c.start}`;
        let n = index.get(key);
        if (n === undefined) {
          n = list.length + 1;
          index.set(key, n);
          list.push({ n, doc, cite: c });
        }
        marks.add(n);
      }
      md += text + [...marks].map((n) => `[${n}](#src-${n})`).join('');
    }
    return { markdown: md, sources: list };
  }, [blocks, docs]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void ask(question);
  };

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8">
      <header className="mb-4 flex items-center gap-3">
        <Sparkles className="mt-1 h-6 w-6 shrink-0 self-start text-brand-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-slate-800">Ask the books</h1>
          <p className="text-sm text-ink/70">Answers only from the reference books, with a link to every line used.</p>
        </div>
        <TourButton tour="ask" />
      </header>

      <div data-tour="ask-plan" className="card mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 p-3 text-sm">
        {premium ? (
          <span className="inline-flex items-center gap-2 font-medium text-ink/90">
            <Crown className="h-4 w-4 text-amber-600" aria-hidden /> Premium · Boericke, Tyler, Allen and Farrington
          </span>
        ) : (
          <span className="text-ink/80">
            <span className="font-medium text-ink/90">Free</span> · Allen and Tyler ·{' '}
            {left} of {FREE_DAILY} questions left today
          </span>
        )}
        <button type="button" className="tap ml-auto font-medium text-brand-700 hover:underline" onClick={() => setCodeOpen((o) => !o)}>
          {premium ? 'Change code' : 'Have a premium code?'}
        </button>
        {codeOpen && (
          <form
            className="flex w-full flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setCode(codeDraft);
              setCodeOpen(false);
            }}
          >
            <label className="min-w-0 flex-1 text-xs text-ink/70">
              Premium code
              <input value={codeDraft} onChange={(e) => setCodeDraft(e.target.value)} className="input mt-1 w-full" autoComplete="off" />
            </label>
            <button type="submit" className="btn-primary">Save</button>
            {premium && (
              <button type="button" className="btn-ghost" onClick={() => (setCode(''), setCodeOpen(false))}>
                Remove code
              </button>
            )}
          </form>
        )}
      </div>

      <form onSubmit={submit} className="mb-6">
        <label htmlFor="ask-question" className="mb-1 block text-sm font-medium text-ink/90">
          Your question
        </label>
        <textarea
          id="ask-question"
          data-tour="ask-question"
          rows={3}
          maxLength={600}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void ask(question);
          }}
          placeholder="e.g. Compare Nux vomica, Aloe and Aesculus"
          className="input w-full resize-y text-base"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="submit" className="btn-primary" disabled={busy || !question.trim() || (!premium && left <= 0)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {busy ? 'Answering…' : 'Ask'}
          </button>
          {EXAMPLES.map((x) => (
            <button key={x} type="button" className="btn-secondary text-xs" onClick={() => setQuestion(x)}>
              {x}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <p role="alert" className="card mb-4 border-amber-300 bg-amber-50 p-3 text-sm text-ink/90">
          {MESSAGES[error] ?? MESSAGES.failed}
        </p>
      )}

      {asked && (busy || markdown || docs.length > 0) && (
        <section aria-labelledby="ask-answer" aria-busy={busy} className="card p-5">
          <h2 id="ask-answer" className="mb-1 text-lg font-semibold text-ink/90">
            {asked}
          </h2>
          {tier && (
            <p className="mb-3 text-xs text-ink/70">
              {tier === 'premium' ? 'Premium answer' : 'Free answer'} from {[...new Set(docs.map((d) => d.label))].join(', ') || 'the books'}
            </p>
          )}
          {!markdown && busy && (
            <p className="flex items-center gap-2 text-sm text-ink/70">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Reading {docs.length || ''} passages…
            </p>
          )}
          <div className="text-subhead leading-relaxed text-ink/90">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>
              {markdown}
            </ReactMarkdown>
          </div>
          {refused && <p className="mt-3 text-sm text-ink/70">The assistant declined to answer this question.</p>}

          {sources.length > 0 && (
            <div data-tour="ask-sources" className="mt-5 border-t border-ink/10 pt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/70">Sources</h3>
              <ol className="space-y-2">
                {sources.map(({ n, doc, cite }) => (
                  <li key={n} id={`src-${n}`} className="flex scroll-mt-20 gap-2 text-sm">
                    <span className="w-6 shrink-0 text-right font-semibold tabular-nums text-brand-700">{n}.</span>
                    <span className="min-w-0">
                      <Link
                        to={`/books/${doc.book}/${doc.slug}?view=full&find=${doc.lines[cite.start] ?? ''}`}
                        className="tap inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
                      >
                        <BookOpenText className="h-4 w-4" aria-hidden />
                        {doc.label} · {doc.name}
                      </Link>
                      <span className="block font-serif text-ink/80">“{cite.text.length > 220 ? `${cite.text.slice(0, 220)}…` : cite.text}”</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <p className="mt-4 text-xs text-ink/70">{DISCLAIMER}</p>
        </section>
      )}
    </div>
  );
}

/** Answer markdown, styled to the app (no typography plugin). */
const MD = {
  a: ({ href, children }: { href?: string; children?: ReactNode }) =>
    href?.startsWith('#src-') ? (
      <a href={href} className="ml-1 align-super text-2xs font-semibold text-brand-700 no-underline hover:underline">
        {children}
      </a>
    ) : (
      <a href={href} className="text-brand-700 underline">
        {children}
      </a>
    ),
  p: ({ children }: { children?: ReactNode }) => <p className="my-2">{children}</p>,
  ul: ({ children }: { children?: ReactNode }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }: { children?: ReactNode }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  h1: ({ children }: { children?: ReactNode }) => <h3 className="mb-1 mt-4 text-base font-semibold">{children}</h3>,
  h2: ({ children }: { children?: ReactNode }) => <h3 className="mb-1 mt-4 text-base font-semibold">{children}</h3>,
  h3: ({ children }: { children?: ReactNode }) => <h4 className="mb-1 mt-3 text-sm font-semibold">{children}</h4>,
  table: ({ children }: { children?: ReactNode }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th className="border border-ink/10 bg-ink/[0.04] p-2 text-left align-top font-semibold">{children}</th>
  ),
  td: ({ children }: { children?: ReactNode }) => <td className="border border-ink/10 p-2 align-top">{children}</td>,
};
