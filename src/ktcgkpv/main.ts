import { readFileSync } from 'fs';
import path from 'path';
import { groupBy } from 'es-toolkit';
import { type CrawHref, Crawler } from '@/lib/nlp/crawler';
import { getPageId, getSentenceId } from '@/lib/nlp/getId';
import { type Page, type SingleLanguageSentence } from '@/lib/nlp/schema';

const main = async () => {
  const bibleMetadata = JSON.parse(
    readFileSync(path.join(__dirname, './metadata.json'), 'utf8'),
  ) as Record<string, unknown>[];

  const crawler = new Crawler({
    domain: 'R',
    subDomain: 'C',
    source: 'ktcgkpv.org',
    getChapters: async ({ resourceHref }) => {
      const bookCode = resourceHref.href.split('/').pop();

      const currentBookMeta = bibleMetadata.find(
        (item) => item.code === bookCode,
      );

      const baseURL = `https://huggingface.co/datasets/v-bible/bible/resolve/main/books/bible/versions/ktcgkpv/kt2011/${bookCode}`;

      return (
        (currentBookMeta?.chapters as Record<string, unknown>[])?.map(
          (chapter) => {
            return {
              href: `${baseURL}/${chapter.number}/${chapter.number}.json`,
              props: {
                chapterNumber: chapter.number as number,
              },
            } satisfies Required<
              CrawHref<{
                chapterNumber: number;
              }>
            >;
          },
        ) || []
      );
    },
    getPageContent: async ({ resourceHref, chapterParams }) => {
      const { verses } = await (await fetch(resourceHref.href)).json();

      const groupByParagraph = groupBy(
        verses,
        (item: Record<string, unknown>) => `${item.parNumber}`,
      );

      return Object.keys(groupByParagraph).map((key) => {
        const pageNumber = +key + 1; // Convert key to number and add 1 for page number

        const paragraphId = getPageId({
          ...chapterParams,
          pageNumber,
        });
        return {
          id: paragraphId,
          number: pageNumber,
          sentences:
            groupByParagraph[key]?.map((verse) => {
              return {
                id: getSentenceId({
                  ...chapterParams,
                  pageNumber,
                  sentenceNumber: verse.number as number,
                }),
                text: verse.content as string,
              } satisfies SingleLanguageSentence;
            }) || [],
        } satisfies Page;
      });
    },
  });

  await crawler.run();
};

main();
