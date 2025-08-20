import path from 'path';
import { ZodError, z } from 'zod/v4';
import Bluebird, { withBluebirdTimeout } from '@/lib//bluebird';
import {
  type Checkpoint,
  type WithCheckpointOptions,
  withCheckpoint,
} from '@/lib/checkpoint';
import { readCsvFileStream, writeChapterContent } from '@/lib/nlp/fileUtils';
import {
  type GenerateTreeOptions,
  type GenerateTreeParams,
  generateDataTree,
  generateJsonTree,
  generateXmlTree,
} from '@/lib/nlp/generateData';
import {
  type ChapterParams,
  type DocumentParams,
  type GenreParams,
  type Metadata,
  type MetadataRowCSVOutput,
  MetadataRowCSVSchema,
  MetadataSchema,
  type Page,
  PageSchema,
  type SentenceHeading,
  type TreeFootnote,
} from '@/lib/nlp/schema';
import { mapMetadataRowCSVToMetadata } from '@/lib/nlp/schemaMapping';
import { logger } from '@/logger/logger';

export type CrawHref<T = Record<string, string>> = {
  href: string;
  props?: T;
};

export type GetChaptersFunctionHref = CrawHref<{
  chapterNumber: number;
  chapterName?: string;
  mdHref?: string;
}>;

export type GetMetadataByFunction = (metadata: MetadataRowCSVOutput) => boolean;
export type FilterCheckpointFunction = (
  checkpoint: Checkpoint<Metadata>,
) => boolean;
export type SortCheckpointFunction = (
  a: Checkpoint<Metadata>,
  b: Checkpoint<Metadata>,
) => number;

export type GetChaptersFunction<
  T extends GetChaptersFunctionHref = GetChaptersFunctionHref,
> = (params: {
  resourceHref: CrawHref;
  documentParams: DocumentParams;
  metadata: Metadata;
}) => Bluebird<Required<T>[]>;

export type GetPageContentParams<
  T extends GetChaptersFunctionHref = GetChaptersFunctionHref,
> = {
  resourceHref: T;
  chapterParams: ChapterParams;
  metadata: Metadata;
};

export type GetPageContentFunction<
  T extends GetChaptersFunctionHref = GetChaptersFunctionHref,
> = (params: GetPageContentParams<T>) => Bluebird<Page[]>;

export type GetPageContentMdFunction<
  T extends GetChaptersFunctionHref = GetChaptersFunctionHref,
> = (params: GetPageContentParams<T>) => Bluebird<string>;

export type GenerateMultipleTreesFunction = {
  extension: string;
  generateTree: (
    params: GenerateTreeParams,
    options?: GenerateTreeOptions,
  ) => string;
}[];

class Crawler {
  name: string;

  domainParams: Omit<GenreParams, 'genre'>;

  metadataFilePath: string;

  checkpointFilePath: string;

  outputFileDir: string;

  metadataList: Metadata[] = [];

  getMetadataBy: GetMetadataByFunction;

  filterCheckpoint?: FilterCheckpointFunction;

  sortCheckpoint?: SortCheckpointFunction;

  getChapters: GetChaptersFunction;

  getPageContent: GetPageContentFunction;

  // NOTE: Optional function to get page content in Markdown format
  getPageContentMd?: GetPageContentMdFunction;

  // NOTE: Allow multiple tree generation formats
  generateMultipleTrees: GenerateMultipleTreesFunction;

  checkpointOptions: WithCheckpointOptions<Metadata>;

  timeout: number;

  constructor({
    name,
    domain,
    subDomain,
    getMetadataBy,
    filterCheckpoint,
    sortCheckpoint,
    getChapters,
    getPageContent,
    getPageContentMd,
    generateMultipleTrees,
    metadataFilePath,
    checkpointFilePath,
    outputFileDir,
    checkpointOptions,
    timeout,
  }: Omit<GenreParams, 'genre'> & {
    name: string;
    getMetadataBy: GetMetadataByFunction;
    filterCheckpoint?: FilterCheckpointFunction;
    sortCheckpoint?: SortCheckpointFunction;
    getChapters: GetChaptersFunction;
    getPageContent: GetPageContentFunction;
    getPageContentMd?: GetPageContentMdFunction;
    generateMultipleTrees?: GenerateMultipleTreesFunction;
    metadataFilePath?: string;
    checkpointFilePath?: string;
    outputFileDir?: string;
    checkpointOptions?: WithCheckpointOptions<Metadata>;
    timeout?: number;
  }) {
    this.name = name;
    this.domainParams = {
      domain,
      subDomain,
    };

    this.getMetadataBy = getMetadataBy;
    this.filterCheckpoint = filterCheckpoint;
    this.sortCheckpoint = sortCheckpoint;
    this.getChapters = getChapters;
    this.getPageContent = getPageContent;
    this.getPageContentMd = getPageContentMd;

    if (!generateMultipleTrees) {
      generateMultipleTrees = [
        {
          extension: 'xml',
          generateTree: (params) => generateXmlTree(generateDataTree(params)),
        },
        {
          extension: 'json',
          generateTree: (params) => generateJsonTree(generateDataTree(params)),
        },
      ];
    }

    this.generateMultipleTrees = generateMultipleTrees;

    if (!metadataFilePath) {
      metadataFilePath = path.join(__dirname, '../../../data', 'main.tsv');
    }

    this.metadataFilePath = metadataFilePath;

    if (!checkpointFilePath) {
      checkpointFilePath = path.join(
        __dirname,
        '../../../dist',
        `${domain}${subDomain}-${name}-checkpoint.json`,
      );
    }

    this.checkpointFilePath = checkpointFilePath;

    if (!outputFileDir) {
      outputFileDir = path.join(__dirname, '../../../dist/corpus');
    }

    this.outputFileDir = outputFileDir;

    this.checkpointOptions = checkpointOptions || {};

    // Default timeout of 15 minutes in milliseconds
    this.timeout = timeout || 900000;
  }

  async getMetadataList() {
    return new Promise<Metadata[]>((resolve, reject) => {
      const metadataRowList: MetadataRowCSVOutput[] = [];

      const tsvStream = readCsvFileStream(this.metadataFilePath, {
        delimiter: '\t',
        // NOTE: Avoid quote conflicts in TSV files
        quote: '',
      });

      tsvStream.on('data', (row: string) => {
        const parseRes = MetadataRowCSVSchema.safeParse(row);

        if (!parseRes.success) {
          logger.error('Error parsing row:', {
            row,
            error: z.prettifyError(parseRes.error),
          });
          return;
        }

        const metadataRow = parseRes.data;

        if (this.getMetadataBy(metadataRow)) {
          metadataRowList.push(metadataRow);
        }
      });

      tsvStream.on('end', () => {
        const metadataList = metadataRowList.map((data) => {
          return mapMetadataRowCSVToMetadata(data) satisfies Metadata;
        });

        resolve(metadataList);
      });

      tsvStream.on('error', (error) => {
        reject(error);
      });
    });
  }

  async run() {
    // NOTE: Get saved checkpoint
    const { filteredCheckpoint: metadataCheckpoint, setCheckpointComplete } =
      await withCheckpoint<Metadata>({
        // NOTE: Remember to bind the context to the function to maintain the
        // correct `this` context
        getInitialData: this.getMetadataList.bind(this),
        getCheckpointId: (data) => data.documentId,
        filterCheckpoint: (checkpoint) => {
          return this.filterCheckpoint
            ? this.filterCheckpoint(checkpoint)
            : !checkpoint.completed;
        },
        sortCheckpoint: this.sortCheckpoint,

        filePath: this.checkpointFilePath,
        options: this.checkpointOptions,
      });

    // eslint-disable-next-line no-restricted-syntax
    for await (const checkpoint of metadataCheckpoint) {
      const parseRes = MetadataSchema.safeParse(checkpoint.params);

      if (!parseRes.success) {
        logger.error('Error parsing metadata checkpoint', {
          id: checkpoint.id,
          error: z.prettifyError(parseRes.error),
        });

        // eslint-disable-next-line no-continue
        continue;
      }

      const metadata = parseRes.data;

      const documentParams = {
        ...this.domainParams,
        genre: metadata.genre.code,
        documentNumber: +metadata.documentNumber,
      };

      let chapterCrawlList: Awaited<ReturnType<GetChaptersFunction>> = [
        {
          href: metadata.sourceURL,
          props: {
            chapterNumber: 1,
          },
        },
      ];

      if (metadata.hasChapters) {
        try {
          chapterCrawlList = await withBluebirdTimeout(
            () =>
              this.getChapters({
                resourceHref: { href: metadata.sourceURL },
                documentParams,
                metadata,
              }),
            this.timeout,
          );
        } catch (error) {
          logger.error(
            `Error getting chapters for document ${metadata.documentId}:`,
            {
              href: metadata.sourceURL,
              error: error instanceof ZodError ? z.prettifyError(error) : error,
            },
          );

          // eslint-disable-next-line no-continue
          continue;
        }
      }

      // eslint-disable-next-line no-restricted-syntax
      for await (const { href, props } of chapterCrawlList) {
        const chapterParams = {
          ...documentParams,
          chapterNumber: props?.chapterNumber,
          chapterName: props?.chapterName || '',
        };

        try {
          const pageContent = await withBluebirdTimeout(
            () =>
              this.getPageContent({
                resourceHref: { href, props },
                chapterParams,
                metadata,
              }),
            this.timeout,
          );

          const parsePageRes = PageSchema.array().safeParse(pageContent);

          if (!parsePageRes.success) {
            logger.error('Error parsing page content', {
              error: z.prettifyError(parsePageRes.error),
              href,
              chapterParams,
            });

            // eslint-disable-next-line no-continue
            continue;
          }

          // eslint-disable-next-line no-restricted-syntax
          for (const { extension, generateTree } of this
            .generateMultipleTrees) {
            const treeFootnotes = parsePageRes.data
              .flatMap((page) => {
                return page.sentences.flatMap((sentence) => {
                  if (sentence.type === 'single') {
                    return sentence?.footnotes || [];
                  }

                  return sentence.array.flatMap(
                    (lang) => lang?.footnotes || [],
                  );
                });
              })
              .map((fn, idx) => ({
                ...fn,
                order: idx,
              })) satisfies TreeFootnote[];

            const treeHeadings = parsePageRes.data.flatMap((page) => {
              return page.sentences.flatMap((sentence) => {
                return sentence.headings || [];
              });
            }) satisfies SentenceHeading[];

            const tree = generateTree({
              chapterParams,
              metadata,
              pages: parsePageRes.data,
              footnotes: treeFootnotes,
              headings: treeHeadings,
            });

            writeChapterContent({
              params: chapterParams,
              baseDir: this.outputFileDir,
              content: tree,
              extension,
              documentTitle: metadata.title,
            });
          }

          if (this.getPageContentMd) {
            try {
              const mdContent = await withBluebirdTimeout(
                () =>
                  this.getPageContentMd!({
                    resourceHref: { href, props },
                    chapterParams,
                    metadata,
                  }),
                this.timeout,
              );

              writeChapterContent({
                params: chapterParams,
                baseDir: this.outputFileDir,
                content: mdContent,
                extension: 'md',
                documentTitle: metadata.title,
              });
            } catch (error) {
              logger.error(
                `Error getting MD content for chapter ${props?.chapterNumber} of document ${metadata.documentId}:`,
                {
                  href,
                  error:
                    error instanceof ZodError ? z.prettifyError(error) : error,
                },
              );
            }
          }

          setCheckpointComplete(checkpoint.id, true);
        } catch (error) {
          logger.error(
            `Error processing chapter ${props?.chapterNumber} for document ${metadata.documentId}:`,
            {
              href,
              error: error instanceof ZodError ? z.prettifyError(error) : error,
            },
          );
        }
      }
    }
  }
}

export { Crawler };
