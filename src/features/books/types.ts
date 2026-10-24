/** A single remedy chapter extracted from a reference book. */
export interface BookRemedy {
  slug: string;
  name: string;
  commonName: string | null;
  /** Botanical family / kingdom, where the source gives one (Allen). */
  family?: string | null;
  text: string;
}

/** Full book payload, served as static JSON from `/books/{id}.json`. */
export interface BookData {
  id: string;
  title: string;
  author: string;
  source: string;
  note?: string;
  remedyCount: number;
  remedies: BookRemedy[];
}

/** Lightweight catalogue entry (bundled) used to render the books list. */
export interface BookMeta {
  id: string;
  title: string;
  author: string;
  /** Short source label for badges and tabs ("Boericke"). */
  label: string;
  /** Short title for compact links ("Keynotes"). */
  shortTitle: string;
  /** Short descriptor of the work. */
  blurb: string;
  /** Tailwind gradient classes for the cover. */
  cover: string;
  /** Approximate number of remedy chapters (for the catalogue card). */
  approxRemedies: number;
}
