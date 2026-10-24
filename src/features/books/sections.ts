// ---------------------------------------------------------------------------
// Sectioned book text (Allen's Keynotes). Paragraphs are separated by blank
// lines; inside a paragraph the first line may be a heading ("Mental
// Generals") and the rest are "• keynote" bullets or plain prose lines.
// Boericke and Tyler have no single newlines, so each of their paragraphs
// parses as one heading-less prose block.
// ---------------------------------------------------------------------------

export interface SectionItem {
  /** Leading label such as "Aggravation" or "Complementary", if any. */
  label?: string;
  text: string;
  bullet: boolean;
}

export interface Section {
  heading: string | null;
  items: SectionItem[];
}

const LABEL_RE = /^([A-Z][A-Za-z\- ]{2,30}):\s+(.*)$/;

function isHeading(line: string): boolean {
  return line.length <= 40 && !line.startsWith('•') && !/[.;:,)”]$/.test(line) && /^[A-Z]/.test(line);
}

function toItem(line: string): SectionItem {
  const bullet = line.startsWith('•');
  const body = bullet ? line.replace(/^•\s*/, '') : line;
  const m = bullet ? LABEL_RE.exec(body) : null;
  return m ? { label: m[1], text: m[2], bullet } : { text: body, bullet };
}

export function parseSections(text: string): Section[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const lines = p.split('\n').map((l) => l.trim()).filter(Boolean);
      const heading = lines.length > 1 && isHeading(lines[0]) ? lines.shift()! : null;
      return { heading, items: lines.map(toItem) };
    });
}

/** True when the text carries Allen-style headings + bullets. */
export function isSectioned(text: string): boolean {
  return /\n• /.test(text);
}
