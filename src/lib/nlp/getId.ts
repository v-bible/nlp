import {
  type ChapterParams,
  type DocumentParams,
  type GenreParams,
  IdParamsSchema,
  type PageParams,
  type SentenceParams,
} from '@/lib/nlp/schema';

// NOTE: Base prefix format: DSG
const getBasePrefix = (params: GenreParams) => {
  IdParamsSchema.omit({
    documentNumber: true,
    chapterNumber: true,
    pageNumber: true,
    sentenceNumber: true,
  }).parse(params);

  return (
    params.domain.toUpperCase() +
    params.subDomain.toUpperCase() +
    params.genre.toUpperCase()
  );
};

// NOTE: Document ID format: DSG_fff
const getDocumentId = (params: DocumentParams) => {
  IdParamsSchema.omit({
    chapterNumber: true,
    pageNumber: true,
    sentenceNumber: true,
  }).parse(params);

  return `${getBasePrefix(params)}_${params.documentNumber.toString().padStart(3, '0')}`;
};

// NOTE: Document chapter ID format: DSG_fff.ccc
const getChapterId = (params: ChapterParams) => {
  IdParamsSchema.omit({
    pageNumber: true,
    sentenceNumber: true,
  }).parse(params);

  return `${getDocumentId(params)}.${params.chapterNumber.toString().padStart(3, '0')}`;
};

// NOTE: Document file ID format: DSG_fff.ccc.ppp
const getPageId = (params: PageParams) => {
  IdParamsSchema.omit({
    sentenceNumber: true,
  }).parse(params);

  return `${getChapterId(params)}.${params.pageNumber.toString().padStart(3, '0')}`;
};

// NOTE: Document sentence ID format: DSG_fff.ccc.ppp.ss
const getSentenceId = (params: SentenceParams) => {
  IdParamsSchema.parse(params);

  return `${getPageId(params)}.${params.sentenceNumber.toString().padStart(2, '0')}`;
};

export { getBasePrefix, getDocumentId, getChapterId, getPageId, getSentenceId };
