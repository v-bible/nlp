import { isValid, parse } from 'date-fns';
import { u } from 'unist-builder';
import { toXml } from 'xast-util-to-xml';
import { type Child, x } from 'xastscript';
import { getChapterId, getDocumentId } from '@/lib/nlp/getId';
import {
  type ChapterParams,
  ChapterParamsSchema,
  type ChapterTree,
  type ChapterTreeOutput,
  ChapterTreeSchema,
  type MetadataInput,
  MetadataSchema,
  type PageInput,
  PageSchema,
  type Sentence,
  type SentenceHeading,
  type TreeFootnote,
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
  chapterParams: ChapterParams;
  metadata: MetadataInput;
  pages: PageInput[];
};

export type GenerateTreeOptions = {
  transformString?: (str: string) => string;
  parseDate?: (date: string) => Date;
};

const generateXmlTree = (chapterTree: ChapterTreeOutput): string => {
  const xmlTree = x(
    'root',
    {},
    ...generateIndent(1, [
      x(
        'FILE',
        { ID: chapterTree.root.file.id, NUMBER: chapterTree.root.file.number },
        ...generateIndent(2, [
          x(
            'meta',
            {},
            ...generateIndent(3, [
              x('DOCUMENT_ID', chapterTree.root.file.meta.documentId),
              x('DOCUMENT_NUMBER', chapterTree.root.file.meta.documentNumber),
              x(
                'GENRE',
                {},
                ...generateIndent(4, [
                  x('CODE', chapterTree.root.file.meta.genre.code),
                  x('CATEGORY', chapterTree.root.file.meta.genre.category),
                  x('VIETNAMESE', chapterTree.root.file.meta.genre.vietnamese),
                ]),
              ),
              x(
                'TAGS',
                {},
                ...generateIndent(4, [
                  ...(chapterTree.root.file.meta.tags?.map(
                    ({ category, vietnamese }) => {
                      return x(
                        'TAG',
                        {},
                        ...generateIndent(5, [
                          x('CATEGORY', category),
                          x('VIETNAMESE', vietnamese),
                        ]),
                      );
                    },
                  ) || []),
                ]),
              ),
              x('TITLE', chapterTree.root.file.meta.title),
              x('VOLUME', chapterTree.root.file.meta.volume),
              x('AUTHOR', chapterTree.root.file.meta.author),
              x('SOURCE_TYPE', chapterTree.root.file.meta.sourceType),
              x('SOURCE_URL', chapterTree.root.file.meta.sourceURL),
              x('SOURCE', chapterTree.root.file.meta.source),
              x(
                'HAS_CHAPTERS',
                chapterTree.root.file.meta.hasChapters ? 'true' : 'false',
              ),
              x('PERIOD', chapterTree.root.file.meta.period),
              x('PUBLISHED_TIME', chapterTree.root.file.meta.publishedTime),
              x('LANGUAGE', chapterTree.root.file.meta.language),
              x('NOTE', chapterTree.root.file.meta.note),
            ]),
          ),

          x(
            'SECT',
            {
              ID: chapterTree.root.file.sect.id,
              NAME: chapterTree.root.file.sect.name,
              NUMBER: chapterTree.root.file.sect.number,
            },
            ...generateIndent(3, [
              ...chapterTree.root.file.sect.pages.map((page) => {
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
                        Object.entries(extraAttributes).forEach(
                          ([key, value]) => {
                            // NOTE: Convert camelCase to snake_case then to UPPERCASE
                            const newKey = key
                              .replace(/([a-z])([A-Z])/g, '$1_$2')
                              .toUpperCase();

                            newExtraAttributes[newKey] = String(value);
                          },
                        );
                      }

                      if (sentence.type === 'single') {
                        return x(
                          'STC',
                          {
                            ID: sentence.id,
                            TYPE: sentence.type,
                            ...newExtraAttributes,
                          },
                          sentence.text,
                        );
                      }

                      return x(
                        'STC',
                        {
                          ID: sentence.id,
                          TYPE: sentence.type,
                          ...newExtraAttributes,
                        },
                        ...generateIndent(
                          5,
                          sentence.array.map((lang) => {
                            return x(lang.languageCode, {}, lang.text);
                          }),
                        ),
                      );
                    }),
                  ),
                );
              }),

              x(
                'FOOTNOTES',
                {},
                ...generateIndent(
                  4,
                  chapterTree.root.file.sect.footnotes?.map((footnote) => {
                    return x(
                      'FOOTNOTE',
                      {
                        SENTENCE_ID: footnote.sentenceId,
                        LABEL: footnote.label,
                        POSITION: footnote.position,
                        ORDER: footnote.order,
                      },
                      footnote.text,
                    );
                  }) || [],
                ),
              ),

              x(
                'HEADINGS',
                {},
                ...generateIndent(
                  4,
                  chapterTree.root.file.sect.headings?.map((heading) => {
                    return x(
                      'HEADING',
                      {
                        SENTENCE_ID: heading.sentenceId,
                        LEVEL: heading.level,
                        ORDER: heading.order,
                      },
                      heading.text,
                    );
                  }) || [],
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

const generateJsonTree = (chapterTree: ChapterTreeOutput): string => {
  return JSON.stringify(chapterTree, null, 2);
};

const generateDataTree = (
  { chapterParams, metadata, pages }: GenerateTreeParams,
  options?: GenerateTreeOptions,
): ChapterTreeOutput => {
  const {
    transformString = defaultTransformString,
    parseDate = defaultParseDate,
  } = options || {};

  // ✅ Validate input
  const parsedChapterParams = ChapterParamsSchema.parse(chapterParams);

  const parsedMetadata = MetadataSchema.extend({
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

  const parsedPages = PageSchema.array().parse(pages);

  const treeFootnotes = parsedPages
    .flatMap((page) => {
      return page.sentences.flatMap((sentence) => {
        if (sentence.type === 'single') {
          return sentence?.footnotes || [];
        }

        return sentence.array.flatMap((lang) => lang?.footnotes || []);
      });
    })
    .map((fn, idx) => ({
      ...fn,
      order: idx,
    })) satisfies TreeFootnote[];

  const treeHeadings = parsedPages.flatMap((page) => {
    return page.sentences.flatMap((sentence) => {
      return sentence.headings || [];
    });
  }) satisfies SentenceHeading[];

  const documentId = getDocumentId({
    domain: chapterParams.domain,
    subDomain: chapterParams.subDomain,
    genre: chapterParams.genre,
    documentNumber: chapterParams.documentNumber,
  });
  const chapterId = getChapterId({
    domain: chapterParams.domain,
    subDomain: chapterParams.subDomain,
    genre: chapterParams.genre,
    documentNumber: chapterParams.documentNumber,
    chapterNumber: chapterParams.chapterNumber,
  });

  const jsonTree = {
    root: {
      file: {
        id: documentId,
        number: parsedMetadata.documentNumber,
        meta: {
          ...parsedMetadata,
          documentId,
          genre: {
            code: parsedMetadata.genre.code,
            category: parsedMetadata.genre.category,
            vietnamese: parsedMetadata.genre.vietnamese,
          },
        },

        sect: {
          id: chapterId,
          name: parsedChapterParams.chapterName,
          number: parsedChapterParams.chapterNumber,
          pages: parsedPages.map((page) => {
            return {
              id: page.id,
              number: page.number,
              sentences: page.sentences.map((sentence) => {
                if (sentence.type === 'single') {
                  return {
                    id: sentence.id,
                    type: sentence.type,
                    extraAttributes: sentence.extraAttributes,
                    text: transformString(sentence.text),
                  };
                }

                return {
                  id: sentence.id,
                  type: sentence.type,
                  extraAttributes: sentence.extraAttributes,
                  array: sentence.array.map((lang) => {
                    return {
                      languageCode: lang.languageCode,
                      text: transformString(lang.text),
                    };
                  }),
                };
              }) satisfies Sentence[],
            };
          }),
          footnotes: treeFootnotes,
          headings: treeHeadings,
        },
      },
    },
  } satisfies ChapterTree;

  // NOTE: Validate the JSON structure
  const parsedTree = ChapterTreeSchema.parse(jsonTree);

  return parsedTree;
};

export {
  newLineIndent,
  generateIndent,
  generateDataTree,
  generateXmlTree,
  generateJsonTree,
};
