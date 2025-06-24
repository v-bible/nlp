import { getPageContent } from '@/hdgmvietnam.com/getPageContent';
import { getPageContentMd } from '@/hdgmvietnam.com/getPageContentMd';
import { Crawler } from '@/lib/nlp/crawler';

const main = async () => {
  const crawler = new Crawler({
    name: 'hdgmvietnam.com',
    domain: 'R',
    subDomain: 'C',
    getMetadataBy: (metadataRow) => {
      return (
        metadataRow.source === 'hdgmvietnam.com' &&
        metadataRow.sourceType === 'web'
      );
    },
    sortCheckpoint: (a, b) => {
      return (
        Number(a.params.requiresManualCheck === true) -
        Number(b.params.requiresManualCheck === true)
      );
    },
    getChapters: async ({ resourceHref }) => {
      // NOTE: These pages have no chapters
      return [
        {
          href: resourceHref.href,
          props: {
            chapterNumber: 1,
          },
        },
      ];
    },
    getPageContent,
    getPageContentMd,
  });

  await crawler.run();
};

main();
