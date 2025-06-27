import { type NerTask } from '@/lib/ner/schema';
import { ChapterTree } from '@/lib/nlp/schema';

const extractSentences = (chapterTree: ChapterTree): NerTask[] => {
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
            metadata: chapterTree.root.file.meta,
          },
        } satisfies NerTask;
      }

      return sentence.array.map((s) => {
        return {
          data: {
            text: s.text,
            documentId: chapterTree.root.file.id,
            sentenceId: sentence.id,
            sentenceType: sentence.type,
            languageCode: s.languageCode,
            metadata: chapterTree.root.file.meta,
          },
        } satisfies NerTask;
      });
    })
    .flat();
};

export { extractSentences };
