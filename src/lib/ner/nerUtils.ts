import { EntityAnnotation, type NerTaskOutput } from '@/lib/ner/schema';
import {
  type ChapterTree,
  ChapterTreeOutput,
  ChapterTreeSchema,
} from '@/lib/nlp/treeSchema';

const extractSentences = (chapterTree: ChapterTree): NerTaskOutput[] => {
  return chapterTree.root.file.sect.pages
    .flatMap((page) => page.sentences)
    .map((sentence) => {
      if (sentence.type === 'single') {
        return {
          data: {
            text: sentence.text,
            documentId: chapterTree.root.file.id,
            sentenceId: sentence.id,
            sentenceType: sentence.type,
            languageCode: undefined,
            title: chapterTree.root.file.meta.title,
            genreCode: chapterTree.root.file.meta.genre.code,
          },
        } satisfies NerTaskOutput;
      }

      return sentence.array.map((s) => {
        return {
          data: {
            text: s.text,
            documentId: chapterTree.root.file.id,
            sentenceId: sentence.id,
            sentenceType: sentence.type,
            languageCode: s.languageCode,
            title: chapterTree.root.file.meta.title,
            genreCode: chapterTree.root.file.meta.genre.code,
          },
        } satisfies NerTaskOutput;
      });
    })
    .flat();
};

const updateAnnotations = (
  tree: ChapterTreeOutput,
  annotations: EntityAnnotation[],
): ChapterTreeOutput => {
  const parsedTree = ChapterTreeSchema.parse(tree);

  return {
    ...parsedTree,
    root: {
      ...parsedTree.root,
      file: {
        ...parsedTree.root.file,
        sect: {
          ...parsedTree.root.file.sect,
          annotations: annotations.length > 0 ? annotations : undefined,
        },
      },
    },
  } satisfies ChapterTreeOutput;
};

// NOTE: Annotations MUST not overlap, so we can safely wrap the text
const wrapNERLabel = (
  text: string,
  annotations: EntityAnnotation[],
): string => {
  // NOTE: Sort the annotations in descending order so when we add
  // annotation content, the position of the next annotation will not be
  // affected
  const reversedAnnotations = annotations.sort((a, b) => b.start - a.start);
  let str = text;

  reversedAnnotations.forEach((annotation) => {
    const { start, end, label } = annotation;

    str = `${str.slice(0, start)}<${label}>${str.slice(start, end)}</${label}>${str.slice(end)}`;
  });

  return str;
};

export { extractSentences, updateAnnotations, wrapNERLabel };
