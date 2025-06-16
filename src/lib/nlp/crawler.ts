import path from 'path';
import { ZodError, z } from 'zod/v4';
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
} from '@/lib/nlp/generateData';
import {
  type ChapterParams,
  type DocumentParams,
  type GenreParams,
  type Metadata,
  type MetadataRowCSV,
  MetadataRowCSVSchema,
  MetadataSchema,
  type PageInput,
  PageSchema,
  mapMetadataRowCSVToMetadata,
} from '@/lib/nlp/schema';
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

export type GetMetadataByFunction = (metadata: MetadataRowCSV) => boolean;
export type FilterCheckpointFunction = (
  checkpoint: Checkpoint<Metadata>,
) => boolean;

export type GetChaptersFunction<
  T extends GetChaptersFunctionHref = GetChaptersFunctionHref,
> = (params: {
  resourceHref: CrawHref;
  documentParams: DocumentParams;
  metadata: Metadata;
}) => Promise<Required<T>[]>;

export type GetPageContentParams<
  T extends GetChaptersFunctionHref = GetChaptersFunctionHref,
> = {
  resourceHref: T;
  chapterParams: ChapterParams;
  metadata: Metadata;
};

export type GetPageContentFunction<
  T extends GetChaptersFunctionHref = GetChaptersFunctionHref,
> = (params: GetPageContentParams<T>) => Promise<PageInput[]>;

export type GetPageContentMdFunction<
  T extends GetChaptersFunctionHref = GetChaptersFunctionHref,
> = (params: GetPageContentParams<T>) => Promise<string>;

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

  getChapters: GetChaptersFunction;

  getPageContent: GetPageContentFunction;

  // NOTE: Optional function to get page content in Markdown format
  getPageContentMd?: GetPageContentMdFunction;

  // NOTE: Allow multiple tree generation formats
  generateMultipleTrees: GenerateMultipleTreesFunction;

  checkpointOptions: WithCheckpointOptions<Metadata>;

  constructor({
    name,
    domain,
    subDomain,
    getMetadataBy,
    filterCheckpoint,
    getChapters,
    getPageContent,
    getPageContentMd,
    generateMultipleTrees,
    metadataFilePath,
    checkpointFilePath,
    outputFileDir,
    checkpointOptions,
  }: Omit<GenreParams, 'genre'> & {
    name: string;
    getMetadataBy: GetMetadataByFunction;
    filterCheckpoint?: FilterCheckpointFunction;
    getChapters: GetChaptersFunction;
    getPageContent: GetPageContentFunction;
    getPageContentMd?: GetPageContentMdFunction;
    generateMultipleTrees?: GenerateMultipleTreesFunction;
    metadataFilePath?: string;
    checkpointFilePath?: string;
    outputFileDir?: string;
    checkpointOptions?: WithCheckpointOptions<Metadata>;
  }) {
    this.name = name;
    this.domainParams = {
      domain,
      subDomain,
    };

    this.getMetadataBy = getMetadataBy;
    this.filterCheckpoint = filterCheckpoint;
    this.getChapters = getChapters;
    this.getPageContent = getPageContent;
    this.getPageContentMd = getPageContentMd;

    if (!generateMultipleTrees) {
      generateMultipleTrees = [
        {
          extension: 'xml',
          generateTree: (params) =>
            generateDataTree(params, {
              type: 'xml',
            }),
        },
        {
          extension: 'json',
          generateTree: (params) =>
            generateDataTree(params, {
              type: 'json',
            }),
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
  }

  async getMetadataList() {
    return new Promise<Metadata[]>((resolve, reject) => {
      const metadataRowList: MetadataRowCSV[] = [];

      const tsvStream = readCsvFileStream(this.metadataFilePath, {
        delimiter: '\t',
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
          chapterCrawlList = await this.getChapters({
            resourceHref: { href: metadata.sourceURL },
            documentParams,
            metadata,
          });
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
          chapterName: props?.chapterName,
        };

        try {
          const pageContent = await this.getPageContent({
            resourceHref: { href, props },
            chapterParams,
            metadata,
          });

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
            const tree = generateTree({
              chapterParams,
              metadata,
              pages: parsePageRes.data,
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
              const mdContent = await this.getPageContentMd({
                resourceHref: { href, props },
                chapterParams,
                metadata,
              });

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

          setCheckpointComplete(metadata.documentId, true);
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
