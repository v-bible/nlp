import Bluebird from '@/lib/bluebird';
import { Crawler } from '@/lib/nlp/crawler';
import { getPageContent } from '@/thanhlinh.net/getPageContent';
import { getPageContentMd } from '@/thanhlinh.net/getPageContentMd';

const main = async () => {
  const crawler = new Crawler({
    name: 'thanhlinh.net',
    domain: 'R',
    subDomain: 'C',
    getMetadataBy: (metadataRow) => {
      return (
        metadataRow.source === 'thanhlinh.net' &&
        metadataRow.sourceType === 'web'
      );
    },
    filterCheckpoint: (checkpoint) => {
      // REVIEW: Currently we get non chapter pages first
      return !checkpoint.completed && !checkpoint.params.hasChapters;
    },
    getChapters: ({ resourceHref }) => {
      return new Bluebird.Promise((resolve) => {
        // NOTE: These pages have no chapters
        resolve([
          {
            href: resourceHref.href,
            props: {
              chapterNumber: 1,
            },
          },
        ]);
      });
    },
    getPageContent,
    getPageContentMd,
  });

  await crawler.run();
};

main();
