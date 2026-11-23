import fs from 'node:fs';
import type { BookData } from '../features/books/types';

/** A bundled book, read from public/books (tests run in Node). */
export const book = (id: string): BookData => JSON.parse(fs.readFileSync(`public/books/${id}.json`, 'utf8'));
