import { isValid, parse } from 'date-fns';
import { u } from 'unist-builder';
import { toXml } from 'xast-util-to-xml';
import { type Child, x } from 'xastscript';
import { z } from 'zod/v4';
import { getChapterId, getDocumentId } from '@/lib/nlp/getId';
import {
  type ChapterParams,
  type ChapterTree,
  ChapterTreeSchema,
  IdParamsSchema,
  type MetadataInput,
  MetadataSchema,
  type Page,
  PageSchema,
} from '@/lib/nlp/schema';

const newLineIndent = (level: number, indentationSize = 2) => {
  return u('text', `\n${' '.repeat(level * indentationSize)}`);
};

// NOTE: Do not add u('text', ' ') here, it will break the XML formatting.
// Remember to add "{}" before "...generateIndent" to avoid the first newLine is
// passed as node value
const generateIndent = (level: number, child: Array<Child>) => {
  return [
    ...child.flatMap((c) => {
      return [newLineIndent(level), c];
    }),
    newLineIndent(level > 0 ? level - 1 : level),
  ];
};

export const defaultTransformString = (str: string) => {
  return str;
};

export const defaultParseDate = (date: string): Date => {
  const formats = ['dd/MM/yyyy', 'yyyy'];

  const parsedDate = formats
    .map((fmt) => parse(date, fmt, new Date()))
    .find((parsed) => isValid(parsed));

  if (parsedDate) {
    return parsedDate;
  }

  throw new Error(`Invalid date format: ${date}`);
};

export type GenerateTreeParams = {
  idParams: ChapterParams;
  metadata: MetadataInput;
  pages: Page[];
};

export type GenerateTreeOptions = {
  transformString?: (str: string) => string;
  parseDate?: (date: string) => Date;
};

const generateXML = (
  { idParams, metadata, pages }: GenerateTreeParams,
  options?: GenerateTreeOptions,
): string => {
  const {
    transformString = defaultTransformString,
    parseDate = defaultParseDate,
  } = options || {};

  // ✅ Validate input
  const { domain, subDomain, genre, documentNumber, chapterNumber } =
    IdParamsSchema.omit({
      pageNumber: true,
      sentenceNumber: true,
    }).parse(idParams);

  const parseMetadata = MetadataSchema.extend({
    publishedTime: MetadataSchema.shape.publishedTime.refine(
      (date) => {
        if (date === '') {
          return true;
        }

        try {
          parseDate(date);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: 'Invalid date format',
      },
    ),
  }).parse(metadata);

  const parsePages = PageSchema.array().parse(pages);

  const documentId = getDocumentId({
    domain,
    subDomain,
    genre,
    documentNumber,
  });
  const chapterId = getChapterId({
    domain,
    subDomain,
    genre,
    documentNumber,
    chapterNumber,
  });

  const xmlTree = u('root', [
    newLineIndent(0),
    x(
      'FILE',
      { ID: documentId, NUMBER: parseMetadata.documentNumber },
      ...generateIndent(1, [
        x(
          'meta',
          {},
          ...generateIndent(2, [
            x('DOCUMENT_ID', documentId),
            x('DOCUMENT_NUMBER', parseMetadata.documentNumber),
            x(
              'GENRE',
              {},
              ...generateIndent(3, [
                x('CODE', parseMetadata.genre.code),
                x('CATEGORY', parseMetadata.genre.category),
                x('VIETNAMESE', parseMetadata.genre.vietnamese),
              ]),
            ),
            x(
              'TAGS',
              {},
              ...generateIndent(3, [
                ...(parseMetadata.tags?.map(({ category, vietnamese }) => {
                  return x(
                    'TAG',
                    {},
                    ...generateIndent(4, [
                      x('CATEGORY', category),
                      x('VIETNAMESE', vietnamese),
                    ]),
                  );
                }) || []),
              ]),
            ),
            x('TITLE', parseMetadata.title),
            x('VOLUME', parseMetadata.volume),
            x('AUTHOR', parseMetadata.author),
            x('SOURCE_TYPE', parseMetadata.sourceType),
            x('SOURCE_URL', parseMetadata.sourceURL),
            x('SOURCE', parseMetadata.source),
            x('HAS_CHAPTERS', parseMetadata.hasChapters ? 'true' : 'false'),
            x('PERIOD', parseMetadata.period),
            x('PUBLISHED_TIME', parseMetadata.publishedTime),
            x('LANGUAGE', parseMetadata.language),
            x('NOTE', parseMetadata.note),
          ]),
        ),

        x(
          'SECT',
          {
            ID: chapterId,
            NAME: parseMetadata.chapterName,
            NUMBER: chapterNumber,
          },
          ...generateIndent(
            2,
            parsePages.map((page) => {
              return x(
                'PAGE',
                { ID: page.id, NUMBER: page.number },
                ...generateIndent(
                  3,
                  page.sentences.map((sentence) => {
                    if ('text' in sentence) {
                      return x(
                        'STC',
                        {
                          ID: sentence.id,
                        },
                        transformString(sentence.text),
                      );
                    }

                    return x(
                      'STC',
                      {
                        ID: sentence.id,
                      },
                      ...generateIndent(
                        4,
                        sentence.array.map((lang) => {
                          return x(
                            lang.languageCode,
                            {},
                            transformString(lang.text),
                          );
                        }),
                      ),
                    );
                  }),
                ),
              );
            }),
          ),
        ),
      ]),
    ),
  ]);

  // Convert the tree to XML string
  return toXml(xmlTree).trim();
};

const generateJson = (
  { idParams, metadata, pages }: GenerateTreeParams,
  options?: GenerateTreeOptions,
): string => {
  const {
    transformString = defaultTransformString,
    parseDate = defaultParseDate,
  } = options || {};

  // ✅ Validate input
  const { domain, subDomain, genre, documentNumber, chapterNumber } =
    IdParamsSchema.omit({
      pageNumber: true,
      sentenceNumber: true,
    }).parse(idParams);

  const parseMetadata = MetadataSchema.extend({
    publishedTime: z.string().refine(
      (date) => {
        try {
          parseDate(date);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: 'Invalid date format',
      },
    ),
  }).parse(metadata);

  const parsePages = PageSchema.array().parse(pages);

  const documentId = getDocumentId({
    domain,
    subDomain,
    genre,
    documentNumber,
  });
  const chapterId = getChapterId({
    domain,
    subDomain,
    genre,
    documentNumber,
    chapterNumber,
  });

  const jsonTree = {
    file: {
      id: documentId,
      number: parseMetadata.documentNumber,
      meta: {
        documentId,
        documentNumber: parseMetadata.documentNumber,
        genre: {
          code: parseMetadata.genre.code,
          category: parseMetadata.genre.category,
          vietnamese: parseMetadata.genre.vietnamese,
        },
        tags: parseMetadata.tags,
        title: parseMetadata.title,
        volume: parseMetadata.volume,
        author: parseMetadata.author,
        sourceType: parseMetadata.sourceType,
        sourceURL: parseMetadata.sourceURL,
        source: parseMetadata.source,
        chapterName: parseMetadata.chapterName,
        hasChapters: parseMetadata.hasChapters,
        period: parseMetadata.period,
        publishedTime: parseMetadata.publishedTime,
        language: parseMetadata.language,
        note: parseMetadata.note,
      },

      sect: {
        id: chapterId,
        name: parseMetadata.chapterName,
        number: chapterNumber,
        pages: parsePages.map((page) => {
          return {
            id: page.id,
            number: page.number,
            sentences: page.sentences.map((sentence) => {
              if ('text' in sentence) {
                return {
                  id: sentence.id,
                  text: transformString(sentence.text),
                };
              }

              return {
                id: sentence.id,
                array: sentence.array.map((lang) => {
                  return {
                    languageCode: lang.languageCode,
                    text: transformString(lang.text),
                  };
                }),
              };
            }),
          };
        }),
      },
    },
  } satisfies ChapterTree;

  // NOTE: Validate the JSON structure
  ChapterTreeSchema.parse(jsonTree);

  return JSON.stringify(jsonTree, null, 2);
};

export { newLineIndent, generateIndent, generateXML, generateJson };
