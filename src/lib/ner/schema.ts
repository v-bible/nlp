import { z } from 'zod/v4';
import { entityLabelCategories } from '@/lib/ner/mapping';
import {
  LanguageCodeSchema,
  MetadataSchema,
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
    title: MetadataSchema.shape.title,
    genreCode: MetadataSchema.shape.genre.shape.code,
  }),
});

export type NerTask = z.infer<typeof NerTaskSchema>;
export type NerTaskInput = z.input<typeof NerTaskSchema>;
export type NerTaskOutput = z.output<typeof NerTaskSchema>;

export const EntityLabelSchema = z.object({
  label: z.string(),
  category: z.string(),
});

export type EntityLabel = z.infer<typeof EntityLabelSchema>;

export const EntityAnnotationSchema = z.object({
  start: z.number().gte(0),
  end: z.number().gte(0),
  text: z.string(),
  label: z.enum(entityLabelCategories.map((eL) => eL.label)),
  sentenceId: z.string(),
  sentenceType: SentenceTypeSchema,
  languageCode: LanguageCodeSchema.optional(),
});

export type EntityAnnotation = z.infer<typeof EntityAnnotationSchema>;
