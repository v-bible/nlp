import fs from 'fs';
import path from 'path';
import { ChapterTreeSchema } from '@/lib//nlp/treeSchema';

interface FileStats {
  fileName: string;
  pageCount: number;
  sentenceCount: number;
  totalWords: number;
}

interface AggregatedStats {
  totalFiles: number;
  totalPages: number;
  totalSentences: number;
  totalWords: number;
}

const analyzeFile = (filePath: string): FileStats => {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = ChapterTreeSchema.parse(JSON.parse(raw));
  const { pages } = data.root.file.sect;

  let sentenceCount = 0;
  let totalWords = 0;

  // eslint-disable-next-line no-restricted-syntax
  for (const page of pages) {
    // eslint-disable-next-line no-restricted-syntax
    for (const sentence of page.sentences) {
      sentenceCount += 1;

      if (sentence.type === 'single') {
        const wordCount = sentence.text.split(/\s+/).filter(Boolean).length;
        totalWords += wordCount;
      }
    }
  }

  return {
    fileName: path.basename(filePath),
    pageCount: pages.length,
    sentenceCount,
    totalWords,
  };
};

const aggregateStats = (filesStats: FileStats[]): AggregatedStats => {
  return filesStats.reduce(
    (acc, file) => {
      acc.totalFiles += 1;
      acc.totalPages += file.pageCount;
      acc.totalSentences += file.sentenceCount;
      acc.totalWords += file.totalWords;
      return acc;
    },
    {
      totalFiles: 0,
      totalPages: 0,
      totalSentences: 0,
      totalWords: 0,
    },
  );
};

const printStats = (stats: AggregatedStats): void => {
  console.log('\n📊 AGGREGATED CORPUS STATS');
  console.log('----------------------------');
  console.log(`📂 Total files: ${stats.totalFiles}`);
  console.log(`📄 Total pages: ${stats.totalPages}`);
  console.log(`✉️ Total sentences: ${stats.totalSentences}`);
  console.log(`🧠 Total words: ${stats.totalWords}`);
  console.log(
    `📏 Avg words per sentence: ${(stats.totalWords / stats.totalSentences).toFixed(2)}`,
  );
};

const main = (): void => {
  const folder = path.join(__dirname, '../../dist/corpus'); // or your folder path

  const files = fs
    .readdirSync(folder)
    .map((genreFolder) =>
      fs
        .readdirSync(path.join(folder, genreFolder))
        .flatMap((documentFolder) =>
          path.join(folder, genreFolder, documentFolder),
        )
        .flatMap((documentFolder) =>
          fs
            .readdirSync(documentFolder)
            .filter((file) => file.endsWith('.json'))
            .map((file) => path.join(documentFolder, file)),
        ),
    )
    .flat();

  const statsPerFile = files.map((filePath) => {
    console.log(`✅ Processing: ${filePath}`);
    return analyzeFile(filePath);
  });

  const aggregated = aggregateStats(statsPerFile);
  printStats(aggregated);
};

main();
