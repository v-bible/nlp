import { createReadStream, mkdirSync, writeFileSync } from 'fs';
import { type ParserOptionsArgs, parseStream } from 'fast-csv';
import { getChapterId, getDocumentId } from '@/lib/nlp/getId';
import { type ChapterParams, type MetadataRowCSV } from '@/lib/nlp/schema';
import { logger } from '@/logger/logger';

const writeChapterContent = ({
  params,
  baseDir,
  content,
  extension,
  documentTitle,
}: {
  params: ChapterParams;
  baseDir: string;
  content: string;
  extension: string;
  documentTitle?: string;
}) => {
  // NOTE: We write to genre dir directly instead of
  // baseDir/domain/subDomain/genre to reduce complexity
  const baseFolder = `${baseDir}/${params.genre}`;

  const documentId = getDocumentId(params);

  let documentFolderPath = `${baseFolder}/${documentId}`;

  if (documentTitle) {
    const sanitizedTitle = documentTitle.replace(/[/\\?%*:|"<>]/g, '_');
    documentFolderPath += ` (${sanitizedTitle})`;
  }

  const fileName = `${documentFolderPath}/${getChapterId(params)}.${extension}`;

  try {
    mkdirSync(documentFolderPath, { recursive: true });
  } catch (error) {
    logger.error(`Error creating folder ${documentFolderPath}:`, error);
  }

  try {
    writeFileSync(fileName, content, 'utf8');
    logger.info(`File written successfully: ${fileName}`);
  } catch (error) {
    logger.error(`Error writing file ${fileName}:`, error);
  }
};

const readCsvFileStream = <T extends MetadataRowCSV>(
  filePath: string,
  options?: Partial<ParserOptionsArgs>,
) => {
  const defaultOptions = {
    headers: true,
  } satisfies Partial<ParserOptionsArgs>;

  const parserOptions = { ...defaultOptions, ...options };

  const stream = createReadStream(filePath, 'utf8');

  return parseStream<T, T>(stream, parserOptions);
};

export { writeChapterContent, readCsvFileStream };
