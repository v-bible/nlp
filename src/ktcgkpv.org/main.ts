import { readFileSync } from 'fs';
import path from 'path';
import sentencize from '@stdlib/nlp-sentencize';
import { groupBy } from 'es-toolkit';
import {
  extractFootnote,
  injectFootnote,
  removeAllFootnote,
} from '@/lib/md/footnoteUtils';
import { Crawler, type GetChaptersFunction } from '@/lib/nlp/crawler';
import { getPageId, getSentenceId } from '@/lib/nlp/getId';
import {
  type Footnote,
  type Heading,
  type PageInput,
  type SingleLanguageSentence,
} from '@/lib/nlp/schema';
import { logger } from '@/logger/logger';

const main = async () => {
  const bibleMetadata = JSON.parse(
    readFileSync(path.join(__dirname, './metadata.json'), 'utf8'),
  ) as Record<string, unknown>[];

  const crawler = new Crawler({
    name: 'ktcgkpv.org',
    domain: 'R',
    subDomain: 'C',
    getMetadataBy: (metadataRow) => {
      return (
        metadataRow.source === 'ktcgkpv.org' && metadataRow.sourceType === 'web'
      );
    },
    sortCheckpoint: (a, b) => {
      return (
        Number(a.params.requiresManualCheck === true) -
        Number(b.params.requiresManualCheck === true)
      );
    },
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
                mdHref: `${baseURL}/${chapter.number}/${chapter.number}.md`,
              },
            } satisfies Awaited<ReturnType<GetChaptersFunction>>[number];
          },
        ) || []
      );
    },
    getPageContent: async ({ resourceHref, chapterParams }) => {
      const {
        verses,
        footnotes = [],
        references = [],
        headings = [],
      } = await (await fetch(resourceHref.href)).json();

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
            groupByParagraph[key]
              ?.flatMap((verse) => {
                const verseHeadings = headings
                  .filter(
                    (heading: Record<string, unknown>) =>
                      heading.verseId === verse.id,
                  )
                  .map((heading: Record<string, unknown>) => {
                    return {
                      text: heading.content as string,
                      level: heading.level as number,
                      order: heading.order as number,
                    };
                  }) as Heading[];

                // NOTE: The problem is verse footnotes and refs are calculated
                // for a verse, which may contains multiple sentences. However,
                // in the next steps, we will split into multiple sentences, we
                // have to put refs back and then extract footnotes and refs
                // again for each sentence.

                const verseFootnotes = footnotes
                  .filter(
                    (fn: Record<string, unknown>) => fn.verseId === verse.id,
                  )
                  .map((fn: Record<string, unknown>) => {
                    return {
                      text: fn.content as string,
                      position: fn.position as number,
                      label: `${fn.order}` as string,
                    };
                  });

                const verseRefs = references
                  .filter(
                    (ref: Record<string, unknown>) => ref.verseId === verse.id,
                  )
                  .map((ref: Record<string, unknown>) => {
                    return {
                      text: ref.content as string,
                      position: ref.position as number,
                      // NOTE: We add asterisk to the label to indicate it's a
                      // reference and not a footnote.
                      label: `${ref.order}*`,
                    };
                  });

                const verseWithFootnotesAndRefs = injectFootnote(
                  verse.content as string,
                  [...verseFootnotes, ...verseRefs],
                );

                // NOTE: Since some verses might have multiple sentences, we have
                // to use tokenizer to split them into sentences.
                const sentences = sentencize(verseWithFootnotesAndRefs);

                return sentences.map((sentence, idx) => {
                  // First, we extract footnotes and references from the split
                  // sentence.
                  const sentenceFootnotes = extractFootnote(
                    sentence,
                    /\[(?<label>[a-zA-Z0-9*]+)\]/gm,
                  ).flatMap((fn) => {
                    const isReference = fn.label.endsWith('*');

                    let verseFootnote: Record<string, unknown> | null = null;

                    // Then we find the corresponding footnote or
                    // reference
                    if (isReference) {
                      verseFootnote = verseRefs.find(
                        (r: Record<string, unknown>) => r.label === fn.label,
                      );
                    } else {
                      verseFootnote = verseFootnotes.find(
                        (f: Record<string, unknown>) => f.label === fn.label,
                      );
                    }

                    if (!verseFootnote) {
                      logger.warn('Footnote text not found for label', {
                        href: resourceHref.href,
                        label: fn.label,
                      });
                      return [];
                    }

                    return [
                      {
                        text: removeAllFootnote(verseFootnote.text as string),
                        label: fn.label,
                        position: fn.position,
                      } satisfies Footnote,
                    ];
                  });

                  return {
                    type: 'single',
                    text: removeAllFootnote(sentence) as string,
                    // NOTE: Headings always belong to the first sentence
                    headings: idx === 0 ? verseHeadings : [],
                    footnotes: sentenceFootnotes,
                    extraAttributes: {
                      verseNumber: verse.number as number,
                      verseOrder: verse.order as number,
                      // NOTE: Start from 0 for parNumber and parIndex
                      parNumber: verse.parNumber as number,
                      parIndex: verse.parIndex as number,
                      isPoetry: verse.isPoetry as boolean,
                    },
                  } satisfies Omit<
                    SingleLanguageSentence,
                    'id' | 'footnotes' | 'headings'
                  > & {
                    footnotes: Footnote[];
                    headings: Heading[];
                  };
                });
              })
              .map((sentence, sentenceNumber) => {
                const newSentenceId = getSentenceId({
                  ...chapterParams,
                  pageNumber,
                  sentenceNumber: sentenceNumber + 1,
                });
                return {
                  ...sentence,
                  id: newSentenceId,
                  footnotes: sentence.footnotes.map((fn, idx) => ({
                    ...fn,
                    order: idx,
                    sentenceId: newSentenceId,
                  })),
                  headings: sentence.headings.map((heading) => ({
                    ...heading,
                    sentenceId: newSentenceId,
                  })),
                } satisfies SingleLanguageSentence;
              }) || [],
        } satisfies PageInput;
      });
    },
    getPageContentMd: async ({ resourceHref }) => {
      if (!resourceHref.props?.mdHref) {
        throw new Error('Markdown href is not provided');
      }

      const md = await (await fetch(resourceHref.props.mdHref)).text();

      return md;
    },
  });

  await crawler.run();
};

main();
