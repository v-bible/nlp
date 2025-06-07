import { z } from 'zod/v4';
import {
  domainCategories,
  genreCategories,
  languageCategories,
  subDomainCategories,
  tagCategories,
} from '@/lib/nlp/mapping';

export const CATEGORY_SEPARATOR = '|';

export const CategorySchema = z.object({
  code: z.string(),
  category: z.string(),
  vietnamese: z.string(),
  categoryType: z.enum(['domain', 'subDomain', 'genre', 'tag', 'language']),
  isReserved: z.boolean().optional(),
});

export type Category = z.infer<typeof CategorySchema>;

export const IdParamsSchema = z.object({
  domain: z.enum(domainCategories.map((c) => c.code)),
  subDomain: z.enum(subDomainCategories.map((c) => c.code)),
  genre: z.enum(
    genreCategories.filter((c) => !c.isReserved).map((c) => c.code),
  ),
  documentNumber: z.number().lt(1000).gte(0),
  chapterNumber: z.number().lt(1000).gte(0),
  pageNumber: z.number().lt(1000).gte(0),
  sentenceNumber: z.number().lt(100).gte(0),
});

export type IdParams = z.infer<typeof IdParamsSchema>;

export type GenreParams = Pick<IdParams, 'domain' | 'subDomain' | 'genre'>;

export type DocumentParams = Pick<
  IdParams,
  'domain' | 'subDomain' | 'genre' | 'documentNumber'
>;

export type ChapterParams = Pick<
  IdParams,
  'domain' | 'subDomain' | 'genre' | 'documentNumber' | 'chapterNumber'
>;

export type PageParams = Pick<
  IdParams,
  | 'domain'
  | 'subDomain'
  | 'genre'
  | 'documentNumber'
  | 'chapterNumber'
  | 'pageNumber'
>;

export type SentenceParams = IdParams;

export const MetadataSchema = z.object({
  documentId: z.string(),
  documentNumber: IdParamsSchema.shape.documentNumber,
  genre: z
    .object({
      code: IdParamsSchema.shape.genre,
      category: z
        .enum(
          genreCategories
            .filter((gC) => !gC.isReserved)
            .map((gC) => gC.category),
        )
        .or(z.literal('')),
      vietnamese: z
        .enum(
          genreCategories
            .filter((gC) => !gC.isReserved)
            .map((gC) => gC.vietnamese),
        )
        .or(z.literal('')),
    })
    .refine(
      (val) => {
        // NOTE: Check if vietnamese is translated from category
        const category = genreCategories.find(
          (gC) => gC.category === val.category,
        );

        return !!category && category.vietnamese === val.vietnamese;
      },
      {
        message: 'Invalid genre category or vietnamese translation',
      },
    ),
  tags: z
    .object({
      category: z
        .enum(tagCategories.map((tC) => tC.category))
        .or(z.literal('')),
      vietnamese: z
        .enum(tagCategories.map((tC) => tC.vietnamese))
        .or(z.literal('')),
    })
    .refine(
      (val) => {
        // NOTE: Check if vietnamese is translated from category
        const category = tagCategories.find(
          (gC) => gC.category === val.category,
        );

        return !!category && category.vietnamese === val.vietnamese;
      },
      {
        message: 'Invalid tag category or vietnamese translation',
      },
    )
    .array(),
  title: z.string(),
  volume: z.string().default(''),
  author: z.string().default(''),
  sourceType: z.enum(['web', 'pdf', 'hardCopy']),
  sourceURL: z.url().or(z.literal('')).default(''),
  source: z.string().default(''),
  chapterName: z.string().optional().default(''),
  hasChapters: z.boolean().default(false),
  period: z.string().default(''),
  publishedTime: z.string().default(''),
  language: z.enum(languageCategories.map((lC) => lC.vietnamese)),
  note: z.string().default(''),
});

export type Metadata = z.infer<typeof MetadataSchema>;
export type MetadataInput = z.input<typeof MetadataSchema>;

export const MetadataRowCSVSchema = MetadataSchema.omit({
  genre: true,
  tags: true,
}).extend({
  documentNumber: z.preprocess((val) => {
    if (typeof val === 'string') {
      return Number.parseInt(val, 10);
    }
    return val;
  }, IdParamsSchema.shape.documentNumber),
  genreCode: IdParamsSchema.shape.genre,
  genreCategory: MetadataSchema.shape.genre.shape.category,
  genreVietnamese: MetadataSchema.shape.genre.shape.vietnamese,
  // NOTE: tagCategory will have format: "tag1 | tag2 | tag3". The same for
  // tagVietnamese
  tagCategory: z.preprocess((val: string) => {
    return val.split(CATEGORY_SEPARATOR).map((tag) => tag.trim());
  }, MetadataSchema.shape.tags.element.shape.category.array()),
  tagVietnamese: z.preprocess((val: string) => {
    return val.split(CATEGORY_SEPARATOR).map((tag) => tag.trim());
  }, MetadataSchema.shape.tags.element.shape.vietnamese.array()),
  hasChapters: z
    .stringbool({
      truthy: ['true', '1'],
      falsy: ['false', '0'],
    })
    .default(false),
});

export type MetadataRowCSV = z.infer<typeof MetadataRowCSVSchema>;
export type MetadataRowCSVInput = z.input<typeof MetadataRowCSVSchema>;

export const SingleLanguageSentenceSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export type SingleLanguageSentence = z.infer<
  typeof SingleLanguageSentenceSchema
>;

export const MultiLanguageSentenceSchema = z.object({
  id: z.string(),
  array: z
    .object({
      languageCode: z.enum(languageCategories.map((lC) => lC.code)),
      text: z.string(),
    })
    .array(),
});

export type MultiLanguageSentence = z.infer<typeof MultiLanguageSentenceSchema>;

// NOTE: Support multiple languages in sentences
export const SentenceSchema = SingleLanguageSentenceSchema.or(
  MultiLanguageSentenceSchema,
);

export type Sentence = z.infer<typeof SentenceSchema>;

export const PageSchema = z.object({
  id: z.string(),
  number: IdParamsSchema.shape.pageNumber,
  sentences: SentenceSchema.array(),
});

export type Page = z.infer<typeof PageSchema>;

export const ChapterTreeSchema = z.object({
  file: z.object({
    id: z.string(),
    number: IdParamsSchema.shape.documentNumber,
    meta: MetadataSchema.extend({
      hasChapters: z.boolean().default(false),
    }),
    sect: z.object({
      id: z.string(),
      name: z.string().default(''),
      number: IdParamsSchema.shape.chapterNumber,
      pages: PageSchema.array(),
    }),
  }),
});

export type ChapterTree = z.infer<typeof ChapterTreeSchema>;

const mapMetadataRowCSVToMetadata = (row: MetadataRowCSV): Metadata => {
  return {
    ...row,
    genre: {
      code: row.genreCode,
      category: row.genreCategory,
      vietnamese: row.genreVietnamese,
    },
    tags: row.tagCategory.map((tC) => {
      return {
        category: tC,
        vietnamese:
          // NOTE: MetadataSchema will validate whether the vietnamese
          // translation matches the category
          tagCategories.find((t) => t.category === tC)?.vietnamese || '',
      };
    }),
  };
};

export { mapMetadataRowCSVToMetadata };
