import { type EntityLabel } from '@/lib/ner/schema';

const entityLabelCategories = [
  {
    label: 'PER',
    category: 'person',
  },
  {
    label: 'LOC',
    category: 'location',
  },
  {
    label: 'ORG',
    category: 'organization',
  },
  {
    label: 'TITLE',
    category: 'title',
  },
  {
    label: 'TME',
    category: 'time',
  },
  {
    label: 'NUM',
    category: 'number',
  },
] as const satisfies EntityLabel[];

export { entityLabelCategories };
