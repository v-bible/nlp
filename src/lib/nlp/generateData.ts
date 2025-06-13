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
  type Sentence,
  type SentenceFootnote,
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

  let aggregatedFootnotes: SentenceFootnote[] = [];

  const pagesMap = parsePages.map((page) => {
    return x(
      'PAGE',
      {
        ID: page.id,
        NUMBER: page.number,
      },
      ...generateIndent(
        4,
        page.sentences.map((sentence) => {
          const extraAttributes = sentence?.extraAttributes;
          const newExtraAttributes: Record<string, string> = {};

          if (extraAttributes) {
            Object.entries(extraAttributes).forEach(([key, value]) => {
              // NOTE: Convert camelCase to snake_case then to UPPERCASE
              const newKey = key
                .replace(/([a-z])([A-Z])/g, '$1_$2')
                .toUpperCase();

              newExtraAttributes[newKey] = String(value);
            });
          }

          if ('text' in sentence) {
            aggregatedFootnotes = [
              ...aggregatedFootnotes,
              ...(sentence.footnotes || []),
            ];

            return x(
              'STC',
              {
                ID: sentence.id,
                ...newExtraAttributes,
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
              5,
              sentence.array.map((lang) => {
                aggregatedFootnotes = [
                  ...aggregatedFootnotes,
                  ...(lang.footnotes || []),
                ];

                return x(lang.languageCode, {}, transformString(lang.text));
              }),
            ),
          );
        }),
      ),
    );
  });

  const xmlTree = x(
    'root',
    {},
    ...generateIndent(1, [
      x(
        'FILE',
        { ID: documentId, NUMBER: parseMetadata.documentNumber },
        ...generateIndent(2, [
          x(
            'meta',
            {},
            ...generateIndent(3, [
              x('DOCUMENT_ID', documentId),
              x('DOCUMENT_NUMBER', parseMetadata.documentNumber),
              x(
                'GENRE',
                {},
                ...generateIndent(4, [
                  x('CODE', parseMetadata.genre.code),
                  x('CATEGORY', parseMetadata.genre.category),
                  x('VIETNAMESE', parseMetadata.genre.vietnamese),
                ]),
              ),
              x(
                'TAGS',
                {},
                ...generateIndent(4, [
                  ...(parseMetadata.tags?.map(({ category, vietnamese }) => {
                    return x(
                      'TAG',
                      {},
                      ...generateIndent(5, [
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
            ...generateIndent(3, [
              pagesMap,
              x(
                'FOOTNOTES',
                {},
                ...generateIndent(
                  4,
                  aggregatedFootnotes.map((footnote) => {
                    return x(
                      'FOOTNOTE',
                      {
                        SENTENCE_ID: footnote.sentenceId,
                        LABEL: footnote.label,
                        POSITION: footnote.position,
                      },
                      footnote.text,
                    );
                  }),
                ),
              ),
            ]),
          ),
        ]),
      ),
    ]),
  );

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

  let aggregatedFootnotes: SentenceFootnote[] = [];

  const pagesMap = parsePages.map((page) => {
    return {
      id: page.id,
      number: page.number,
      sentences: page.sentences.map((sentence) => {
        if ('text' in sentence) {
          aggregatedFootnotes = [
            ...aggregatedFootnotes,
            ...(sentence.footnotes || []),
          ];

          return {
            id: sentence.id,
            extraAttributes: sentence.extraAttributes,
            text: transformString(sentence.text),
          };
        }

        return {
          id: sentence.id,
          extraAttributes: sentence.extraAttributes,
          array: sentence.array.map((lang) => {
            aggregatedFootnotes = [
              ...aggregatedFootnotes,
              ...(lang.footnotes || []),
            ];

            return {
              languageCode: lang.languageCode,
              text: transformString(lang.text),
            };
          }),
        };
      }) satisfies Sentence[],
    };
  });

  const jsonTree = {
    root: {
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
          pages: pagesMap,
          footnotes: aggregatedFootnotes,
        },
      },
    },
  } satisfies ChapterTree;

  // NOTE: Validate the JSON structure
  ChapterTreeSchema.parse(jsonTree);

  return JSON.stringify(jsonTree, null, 2);
};

export { newLineIndent, generateIndent, generateXML, generateJson };
