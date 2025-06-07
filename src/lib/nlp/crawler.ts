import path from 'path';
import { type ZodError, z } from 'zod/v4';
import { type WithCheckpointOptions, withCheckpoint } from '@/lib/checkpoint';
import { readCsvFileStream, writeChapterContent } from '@/lib/nlp/fileUtils';
import {
  type GenerateTreeOptions,
  type GenerateTreeParams,
  generateXML,
} from '@/lib/nlp/generateData';
import {
  type ChapterParams,
  type DocumentParams,
  type GenreParams,
  type Metadata,
  type MetadataRowCSV,
  MetadataRowCSVSchema,
  MetadataSchema,
  type Page,
  mapMetadataRowCSVToMetadata,
} from '@/lib/nlp/schema';
import { logger } from '@/logger/logger';

export type CrawHref<T = Record<string, string>> = {
  href: string;
  props?: T;
};

class Crawler {
  domainParams: Omit<GenreParams, 'genre'>;

  source: Metadata['source'];

  sourceType: Metadata['sourceType'];

  metadataFilePath: string;

  checkpointFilePath: string;

  outputXmlDir: string;

  metadataList: Metadata[] = [];

  getChapters: (params: {
    resourceHref: CrawHref;
    documentParams: DocumentParams;
    metadata: Metadata;
  }) => Promise<
    Required<
      CrawHref<{
        chapterNumber: number;
      }>
    >[]
  >;

  getPageContent: (params: {
    resourceHref: CrawHref<{
      chapterNumber: number;
    }>;
    chapterParams: ChapterParams;
    metadata: Metadata;
  }) => Promise<Page[]>;

  generateTree: (
    params: GenerateTreeParams,
    options?: GenerateTreeOptions,
  ) => string;

  checkpointOptions: WithCheckpointOptions<Metadata>;

  constructor({
    domain,
    subDomain,
    source,
    getChapters,
    getPageContent,
    generateTree,
    sourceType = 'web',
    metadataFilePath,
    checkpointFilePath,
    outputXmlDir,
    checkpointOptions,
  }: Omit<GenreParams, 'genre'> & {
    source: Metadata['source'];
    getChapters: (params: {
      resourceHref: CrawHref;
      documentParams: DocumentParams;
      metadata: Metadata;
    }) => Promise<
      Required<
        CrawHref<{
          chapterNumber: number;
        }>
      >[]
    >;
    getPageContent: (params: {
      resourceHref: CrawHref<{
        chapterNumber: number;
      }>;
      chapterParams: ChapterParams;
      metadata: Metadata;
    }) => Promise<Page[]>;
    generateTree?: (
      params: GenerateTreeParams,
      options?: GenerateTreeOptions,
    ) => string;
    sourceType?: Metadata['sourceType'];
    metadataFilePath?: string;
    checkpointFilePath?: string;
    outputXmlDir?: string;
    checkpointOptions?: WithCheckpointOptions<Metadata>;
  }) {
    this.domainParams = {
      domain,
      subDomain,
    };
    this.source = source;

    this.getChapters = getChapters;
    this.getPageContent = getPageContent;

    if (!generateTree) {
      generateTree = generateXML;
    }

    this.generateTree = generateTree;

    this.sourceType = sourceType;

    if (!metadataFilePath) {
      metadataFilePath = path.join(__dirname, '../../../data', 'main.tsv');
    }

    this.metadataFilePath = metadataFilePath;

    if (!checkpointFilePath) {
      checkpointFilePath = path.join(
        __dirname,
        '../../../dist',
        `${domain}${subDomain}-${source}-checkpoint.json`,
      );
    }

    this.checkpointFilePath = checkpointFilePath;

    if (!outputXmlDir) {
      outputXmlDir = path.join(__dirname, '../../../dist/nlp-data');
    }

    this.outputXmlDir = outputXmlDir;

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
            error: z.prettifyError(parseRes.error),
          });
          return;
        }

        const metadataRow = parseRes.data;

        if (
          metadataRow.source === this.source &&
          metadataRow.sourceType === this.sourceType
        ) {
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
        filePath: this.checkpointFilePath,
        options: this.checkpointOptions,
      });

    // eslint-disable-next-line no-restricted-syntax
    for await (const checkpoint of metadataCheckpoint) {
      const parseRes = MetadataSchema.safeParse(checkpoint.params);

      if (!parseRes.success) {
        logger.error('Error parsing metadata checkpoint', {
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

      let chapterCrawlList: Required<
        CrawHref<{
          chapterNumber: number;
        }>
      >[] = [
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
              error: z.prettifyError(error as ZodError),
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
        };

        try {
          const pageContent = await this.getPageContent({
            resourceHref: { href, props },
            chapterParams,
            metadata,
          });

          const tree = this.generateTree({
            idParams: chapterParams,
            metadata,
            pages: pageContent,
          });

          writeChapterContent({
            params: chapterParams,
            baseDir: this.outputXmlDir,
            content: tree,
            extension: 'xml',
            documentTitle: metadata.title,
          });

          setCheckpointComplete(metadata.documentId, true);
        } catch (error) {
          logger.error(
            `Error processing chapter ${props?.chapterNumber} for document ${metadata.documentId}:`,
            { href, error: z.prettifyError(error as ZodError) },
          );
        }
      }
    }
  }
}

export { Crawler };
