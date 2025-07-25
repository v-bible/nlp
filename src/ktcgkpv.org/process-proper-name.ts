/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { groupBy, pick, uniqBy } from 'es-toolkit';
import { updateAnnotations } from '@/lib/ner/nerUtils';
import { type SentenceEntityAnnotation } from '@/lib/ner/schema';
import { walkDirectoryByGenre, writeChapterContent } from '@/lib/nlp/fileUtils';
import {
  generateDataTreeWithAnnotation,
  generateJsonTree,
  generateXmlTree,
} from '@/lib/nlp/generateData';
import { parseId } from '@/lib/nlp/getId';
import { type GenreParams } from '@/lib/nlp/schema';
import { ChapterTreeSchema } from '@/lib/nlp/treeSchema';
import { logger } from '@/logger/logger';
import { corpusDir } from '@/ner-processing/constant';

export type ProperName = {
  vietnamese: string;
  origin: string;
  latin: string;
  french: string;
  english: string;
};

export const findNameMatches = (text: string, names: string[]) => {
  // Create set of lowercase names for fast lookup
  const nameSet = new Set(
    names.filter((name) => name && name.length > 0).map((name) => name.trim()),
  );

  const matches: Array<{ text: string; start: number; end: number }> = [];

  // Use regex to match words including hyphens, apostrophes, and Vietnamese characters
  // [^\s]+ matches any non-whitespace characters (better for Vietnamese names)
  const regex = /[^\s]+/giu;
  const foundMatches = Array.from(text.matchAll(regex));

  foundMatches.forEach((match) => {
    const word = match[0];
    // Remove punctuation from the end for matching
    const cleanWord = word.replace(/[^\w'-]+$/u, '');
    if (nameSet.has(cleanWord.trim())) {
      matches.push({
        text: cleanWord, // Keep original case but without trailing punctuation
        start: match.index!,
        end: match.index! + cleanWord.length,
      });
    }
  });

  return matches.sort((a, b) => a.start - b.start);
};

const processProperName = (
  nameLocaleList: Array<keyof ProperName>,
  primaryLocale: keyof ProperName = 'english',
) => {
  const data = readFileSync(
    path.join(__dirname, '../../data/proper-name.json'),
    'utf-8',
  );

  const properName = JSON.parse(data) as ProperName[];

  const processData = properName.map((d) => {
    // NOTE: Cleanup the names by removing numbers and parentheses
    return Object.fromEntries(
      Object.entries(d).map(([key, value]) => {
        return [
          key,
          value
            // NOTE: Vietnamese has newlines: "A-bu-bô\n1 Mcb 16,11.15"
            .split('\n')
            .at(0)!
            .replaceAll(/\d/gm, '')
            .replaceAll(/\([^)]+\)/gm, '')
            .trim(),
        ];
      }),
    );
  });

  const groupProperName = groupBy(
    uniqBy(
      // NOTE: Only pick specified locale names
      processData.map((item) => pick(item, nameLocaleList)),
      // NOTE: Create unique key based on specified locales, ex: { vietnamese:
      // 'Nguyễn', english: 'Nguyen' } => 'Nguyễn-Nguyen'
      (item) => nameLocaleList.map((locale) => item[locale]).join('-'),
    ),
    // NOTE: Then group by the primary locale, ex: 'english'
    (item) => item[primaryLocale],
  );

  const flatProperName = [
    ...new Set(
      Object.values(groupProperName)
        .flat()
        .flatMap((d) => Object.values(d)),
    ),
  ];

  writeFileSync(
    path.join(__dirname, '../../data/proper-name-processed.json'),
    JSON.stringify(flatProperName, null, 2),
  );

  return flatProperName;
};

const main = () => {
  const currentGenre = 'N' satisfies GenreParams['genre'];

  const nameLocaleList =
    // NOTE: For N and O is data from ktcgkpv then it is better to match
    // vietnames names only
    (
      currentGenre === 'N' || currentGenre === 'O'
        ? ['vietnamese']
        : ['vietnamese', 'english']
    ) satisfies Array<keyof ProperName>;

  const allProperNames = processProperName(nameLocaleList, 'english');

  // NOTE: Get all json files from dir.
  const files = walkDirectoryByGenre(corpusDir, currentGenre);

  const jsonFiles = files.filter((file) => file.endsWith('.json'));

  // NOTE: Read all json files and extract sentences.
  for (const corpusFilePath of jsonFiles) {
    const fileData = JSON.parse(readFileSync(corpusFilePath, 'utf-8'));

    const treeParse = ChapterTreeSchema.safeParse(fileData);

    if (!treeParse.success) {
      logger.error(
        `Invalid data in file ${corpusFilePath}: ${treeParse.error.message}`,
      );
      continue;
    }

    const treeData = treeParse.data;

    const newAnnotations = treeData.root.file.sect.pages.flatMap((page) => {
      return page.sentences
        .map((sentence) => {
          if (sentence.type === 'single') {
            const { text } = sentence;

            const matchedNames = findNameMatches(text, allProperNames);

            return matchedNames.map((match) => {
              return {
                ...match,
                // NOTE: Currently we hardcode the label to 'PER' for proper names
                labels: ['PER'],
                sentenceId: sentence.id,
                languageCode: '',
                sentenceType: sentence.type,
              } satisfies SentenceEntityAnnotation;
            });
          }

          return sentence.array.flatMap((s) => {
            const { text } = s;

            const matchedNames = findNameMatches(text, allProperNames);

            return matchedNames.flatMap((match) => {
              return {
                ...match,
                // NOTE: Currently we hardcode the label to 'PER' for proper names
                labels: ['PER'],
                sentenceId: sentence.id,
                languageCode: s.languageCode,
                sentenceType: sentence.type,
              } satisfies SentenceEntityAnnotation;
            });
          });
        })
        .flat();
    }) satisfies SentenceEntityAnnotation[];

    const parseParams = parseId(treeData.root.file.id);

    if (!parseParams) {
      logger.error(`Invalid file ID: ${treeData.root.file.id}`);
      continue;
    }

    const chapterParams = {
      chapterName: treeData.root.file.sect.name,
      chapterNumber: treeData.root.file.sect.number,
      documentNumber: treeData.root.file.meta.documentNumber,
      domain: parseParams.domain!,
      genre: treeData.root.file.meta.genre.code,
      subDomain: parseParams.subDomain!,
    };

    const newTree = updateAnnotations(treeData, newAnnotations);

    // NOTE: We don't need to wrap NER label in sentence for json tree
    const jsonTree = generateJsonTree(newTree);

    const treeWithAnnotation = generateDataTreeWithAnnotation({
      chapterParams,
      metadata: newTree.root.file.meta,
      pages: newTree.root.file.sect.pages,
      annotations: newAnnotations,
    });

    const xmlTree = generateXmlTree(treeWithAnnotation);

    writeChapterContent({
      params: chapterParams,
      baseDir: corpusDir,
      content: jsonTree,
      extension: 'json',
      documentTitle: newTree.root.file.meta.title,
    });

    writeChapterContent({
      params: chapterParams,
      baseDir: corpusDir,
      content: xmlTree,
      extension: 'xml',
      documentTitle: newTree.root.file.meta.title,
    });

    logger.info(`Updated annotations for ${newTree.root.file.meta.documentId}`);
  }
};

main();
