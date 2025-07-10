import { getPageContent } from '@/dongten.net/getPageContent';
import { getPageContentMd } from '@/dongten.net/getPageContentMd';
import Bluebird from '@/lib/bluebird';
import { Crawler } from '@/lib/nlp/crawler';

const main = async () => {
  const crawler = new Crawler({
    name: 'dongten.net',
    domain: 'R',
    subDomain: 'C',
    getMetadataBy: (metadataRow) => {
      return (
        metadataRow.source === 'dongten.net' && metadataRow.sourceType === 'web'
      );
    },
    sortCheckpoint: (a, b) => {
      return (
        Number(a.params.requiresManualCheck === true) -
        Number(b.params.requiresManualCheck === true)
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
