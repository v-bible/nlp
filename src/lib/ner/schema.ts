import { z } from 'zod/v4';
import {
  ChapterTreeSchema,
  MultiLanguageSentenceSchema,
  SentenceTypeSchema,
} from '@/lib/nlp/schema';

export const NerTaskSchema = z.object({
  data: z.object({
    text: z.string(),
    documentId: z.string(),
    sentenceId: z.string(),
    sentenceType: SentenceTypeSchema,
    languageCode:
      MultiLanguageSentenceSchema.shape.array.element.shape.languageCode.optional(),
    metadata: ChapterTreeSchema.shape.root.shape.file.shape.meta.optional(),
  }),
});

export type NerTask = z.infer<typeof NerTaskSchema>;

export const EntityLabelSchema = z.enum([
  'PER',
  'LOC',
  'ORG',
  'TITLE',
  'TME',
  'NUM',
]);

export type EntityLabel = z.infer<typeof EntityLabelSchema>;

export const EntityAnnotationSchema = z.object({
  start: z.number().gte(0),
  end: z.number().gte(0),
  text: z.string(),
  label: EntityLabelSchema,
});

export type EntityAnnotation = z.infer<typeof EntityAnnotationSchema>;
