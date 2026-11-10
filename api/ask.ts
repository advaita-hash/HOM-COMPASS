import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import type { BookData } from '../src/features/books/types';
import { type SourceBook, retrieve } from '../src/features/ask/retrieve';

// ---------------------------------------------------------------------------
// "Ask the books": answers a question from the reference books only, citing
// the lines it used. Vercel function: POST /api/ask {question, code?}.
//
//   free     Claude Haiku 5.5 · Allen and Tyler · FREE_DAILY_LIMIT a day
//   premium  Claude Opus 5.5  · all four books  · a code from PREMIUM_CODES
//
// Environment: ANTHROPIC_API_KEY (required), PREMIUM_CODES (comma-separated),
// FREE_DAILY_LIMIT (default 2). The response is NDJSON, one event per line:
//   {t:'sources', tier, docs}  the passages sent, with their line places
//   {t:'text', i, d}           answer text for block i
//   {t:'cite', i, c}           a citation on block i: c = {doc, start, end, text}
//   {t:'done', refused?}       end of the answer
//   {t:'error', code}          'busy' | 'failed'
// ---------------------------------------------------------------------------

const LABELS: Record<string, string> = { boericke: 'Boericke', tyler: 'Tyler', allen: 'Allen', farrington: 'Farrington' };

const TIERS = {
  free: { model: 'claude-haiku-5-5', books: ['allen', 'tyler'] },
  premium: { model: 'claude-opus-5-5', books: ['boericke', 'tyler', 'allen', 'farrington'] },
} as const;
type Tier = keyof typeof TIERS;

const SYSTEM = `You answer homeopathy students' questions using ONLY the book passages provided as documents (classical materia medica: Boericke, Tyler, Allen's Keynotes, Farrington).

Rules:
- Use nothing but the provided passages. Do not add facts, remedies, potencies or doses that the passages do not state. If the passages do not cover something the question asks, say plainly what is missing (e.g. "Allen and Tyler do not cover Carduus").
- Cite the passages for every point you make.
- Answer in short-answer exam style: brief, scannable, no preamble.
- For a comparison, give a markdown table (one column per remedy; rows such as Type, Key symptoms, Modalities: worse / better), then one "In short" line with the distinguishing points.
- For a drug picture, give bullet points: Constitution, Mind, Generals, key local symptoms, Modalities, Relations, as far as the passages allow.
- Name the book a point comes from when the books differ.
- This is a study aid: never advise a specific patient.`;

const bookCache = new Map<string, BookData>();
function loadBook(id: string): BookData {
  let b = bookCache.get(id);
  if (!b) {
    b = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'books', `${id}.json`), 'utf8')) as BookData;
    bookCache.set(id, b);
  }
  return b;
}

/** Free questions per network per day. Per server instance: a backstop to the app's own count. */
const freeUse = new Map<string, { day: string; n: number }>();
function takeFreeQuestion(ip: string): boolean {
  const limit = Number(process.env.FREE_DAILY_LIMIT ?? 2);
  const day = new Date().toISOString().slice(0, 10);
  const u = freeUse.get(ip);
  const n = u && u.day === day ? u.n : 0;
  if (n >= limit) return false;
  freeUse.set(ip, { day, n: n + 1 });
  return true;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function POST(request: Request): Promise<Response> {
  let body: { question?: unknown; code?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'bad-request' });
  }
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (question.length < 3 || question.length > 600) return json(400, { error: 'bad-question' });
  if (!process.env.ANTHROPIC_API_KEY) return json(503, { error: 'not-configured' });

  const codes = (process.env.PREMIUM_CODES ?? '').split(',').map((c) => c.trim()).filter(Boolean);
  const tier: Tier = typeof body.code === 'string' && codes.includes(body.code.trim()) ? 'premium' : 'free';
  const books: SourceBook[] = TIERS[tier].books.map((id) => ({ id, label: LABELS[id], data: loadBook(id) }));
  const passages = retrieve(question, books);
  if (!passages.length) return json(200, { error: 'no-passages', tier });

  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  if (tier === 'free' && !takeFreeQuestion(ip)) return json(429, { error: 'limit', tier });

  const client = new Anthropic();
  const documents: Anthropic.Beta.BetaContentBlockParam[] = passages.map((p) => ({
    type: 'document',
    title: `${p.bookLabel} — ${p.name}`,
    source: { type: 'content', content: p.lines.map((l) => ({ type: 'text', text: l.text })) },
    citations: { enabled: true },
  }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      send({
        t: 'sources',
        tier,
        docs: passages.map((p) => ({
          book: p.book,
          label: p.bookLabel,
          slug: p.slug,
          name: p.name,
          lines: p.lines.map((l) => `${l.block}:${l.start}-${l.end}`),
        })),
      });
      try {
        const answer = client.beta.messages.stream({
          model: TIERS[tier].model,
          max_tokens: 16000,
          system: SYSTEM,
          output_config: { effort: 'medium' },
          // Opus: if a safety classifier declines, the API retries on a fallback model in the same call
          ...(tier === 'premium' ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
          messages: [{ role: 'user', content: [...documents, { type: 'text', text: question }] }],
        });
        for await (const event of answer) {
          if (event.type !== 'content_block_delta') continue;
          if (event.delta.type === 'text_delta') send({ t: 'text', i: event.index, d: event.delta.text });
          else if (event.delta.type === 'citations_delta' && event.delta.citation.type === 'content_block_location') {
            const c = event.delta.citation;
            send({ t: 'cite', i: event.index, c: { doc: c.document_index, start: c.start_block_index, end: c.end_block_index, text: c.cited_text } });
          }
        }
        const final = await answer.finalMessage();
        send({ t: 'done', refused: final.stop_reason === 'refusal' });
      } catch (err) {
        send({ t: 'error', code: err instanceof Anthropic.RateLimitError ? 'busy' : 'failed' });
        console.error('ask failed', err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err);
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store' } });
}
