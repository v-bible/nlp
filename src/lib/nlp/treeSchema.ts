import { z } from 'zod/v4';
import { EntityAnnotationSchema } from '@/lib/ner/schema';
import {
  IdParamsSchema,
  MetadataSchema,
  MultiLanguageSentenceSchema,
  PageSchema,
  SentenceHeadingSchema,
  SingleLanguageSentenceSchema,
  TreeFootnoteSchema,
} from '@/lib/nlp/schema';

export const ChapterTreeSchema = z.object({
  root: z.object({
    file: z.object({
      id: z.string(),
      number: IdParamsSchema.shape.documentNumber,
      meta: MetadataSchema.omit({
        requiresManualCheck: true,
      }),
      sect: z.object({
        id: z.string(),
        name: z.string().optional().default(''),
        number: IdParamsSchema.shape.chapterNumber,
        pages: PageSchema.omit({
          sentences: true,
        })
          .extend({
            sentences: SingleLanguageSentenceSchema.omit({
              footnotes: true,
            })
              .or(
                MultiLanguageSentenceSchema.extend({
                  array: MultiLanguageSentenceSchema.shape.array.element
                    .omit({
                      footnotes: true,
                    })
                    .array(),
                }),
              )
              .array(),
          })
          .array(),
        footnotes: TreeFootnoteSchema.array().optional(),
        headings: SentenceHeadingSchema.array().optional(),
        annotations: EntityAnnotationSchema.array().optional(),
      }),
    }),
  }),
});

export type ChapterTree = z.infer<typeof ChapterTreeSchema>;
export type ChapterTreeInput = z.input<typeof ChapterTreeSchema>;
export type ChapterTreeOutput = z.output<typeof ChapterTreeSchema>;
