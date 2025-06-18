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
    filterCheckpoint: (checkpoint) => {
      const ignore = [
        'https://hdgmvietnam.com/chi-tiet/toan-van-tong-huan-quedira-amazonia-amazon-yeu-quy--39152',
      ];

      return !ignore.includes(checkpoint.params.sourceURL);
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
