import { type NerData } from '@/lib/ner/schema';
import { type ChapterTreeOutput } from '@/lib/nlp/treeSchema';

const mapTreeToNerData = (chapterTree: ChapterTreeOutput): NerData[] => {
  const annotations = chapterTree?.root.file.sect.annotations?.map(
    (annotation) => {
      return {
        value: {
          start: annotation.start,
          end: annotation.end,
          text: annotation.text,
          labels: annotation.labels,
        },
        // NOTE: This is hard-coded and should match with label studio template
        // from README.md, especially the "to_name" key
        from_name: 'label',
        to_name: 'text',
        type: 'labels',
      };
    },
  );

  return chapterTree.root.file.sect.pages
    .flatMap((page) => page.sentences)
    .map((sentence) => {
      if (sentence.type === 'single') {
        return {
          data: {
            text: sentence.text,
            documentId: chapterTree.root.file.id,
            chapterId: chapterTree.root.file.sect.id,
            sentenceId: sentence.id,
            sentenceType: sentence.type,
            languageCode: '',
            title: chapterTree.root.file.meta.title,
            genreCode: chapterTree.root.file.meta.genre.code,
          },
          // NOTE: DO NOT include empty annotations array because this will be
          // imported as ground truth data in Label Studio
          ...(annotations && {
            annotations: [
              {
                result: annotations,
              },
            ],
          }),
        } satisfies NerData;
      }

      return sentence.array.map((s) => {
        return {
          data: {
            text: s.text,
            documentId: chapterTree.root.file.id,
            chapterId: chapterTree.root.file.sect.id,
            sentenceId: sentence.id,
            sentenceType: sentence.type,
            languageCode: s.languageCode,
            title: chapterTree.root.file.meta.title,
            genreCode: chapterTree.root.file.meta.genre.code,
          },
          // NOTE: DO NOT include empty annotations array because this will be
          // imported as ground truth data in Label Studio
          ...(annotations && {
            annotations: [
              {
                result: annotations,
              },
            ],
          }),
        } satisfies NerData;
      });
    })
    .flat();
};

export { mapTreeToNerData };
