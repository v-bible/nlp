import { getPageContent } from '@/hdgmvietnam.com/getPageContent';
import { Crawler } from '@/lib/nlp/crawler';

const main = async () => {
  const crawler = new Crawler({
    domain: 'R',
    subDomain: 'C',
    source: 'hdgmvietnam.com',
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
  });

  await crawler.run();
};

main();
