import { getChapters } from '@/augustino.net/getChapters';
import { getPageContent } from '@/augustino.net/getPageContent';
import { getPageContentMd } from '@/augustino.net/getPageContentMd';
import { Crawler } from '@/lib/nlp/crawler';

const main = async () => {
  const crawler = new Crawler({
    name: 'augustino.net',
    domain: 'R',
    subDomain: 'C',
    getMetadataBy: (metadataRow) => {
      return (
        metadataRow.source === 'augustino.net' &&
        metadataRow.sourceType === 'web'
      );
    },
    getChapters,
    getPageContent,
    getPageContentMd,
  });

  await crawler.run();
};

main();
