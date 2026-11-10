import type { Tour } from '../types';

// The plan line, the question box, then the sources list (shown once an
// answer has cited something; a centred card explains it before then).
export default {
  id: 'ask',
  title: 'Ask the books',
  summary: 'Ask a question and get a short answer or comparison taken only from the reference books, with links to every line used.',
  route: '/ask',
  order: 25,
  version: 1,
  steps: [
    {
      id: 'plan',
      target: 'ask-plan',
      title: 'Free or premium',
      body: 'Free answers use Allen and Tyler, 2 questions a day. Premium answers use all four books, with no daily limit.',
      tip: 'Got a premium code? {Tap} Have a premium code? and enter it.',
    },
    {
      id: 'question',
      target: 'ask-question',
      title: 'Your question',
      body: 'Name the remedies and the topic, like a short exam question. Comparisons come back as a table.',
      tip: 'Try: Compare Apis and Apocynum in dropsy.',
    },
    {
      id: 'sources',
      target: 'ask-sources',
      ifMissing: 'center',
      title: 'Sources',
      body: 'Each point in an answer has a small number. {Tap} a source to open that line in the book, highlighted.',
    },
  ],
} satisfies Tour;
