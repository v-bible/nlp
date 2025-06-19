/* eslint-disable no-restricted-syntax */
/* eslint-disable no-continue */
import sentencize from '@stdlib/nlp-sentencize';
import retry from 'async-retry';
import { chromium, devices } from 'playwright';
import { removeAllFootnote } from '@/lib/md/footnoteUtils';
import { extractHeading, removeAllHeading } from '@/lib/md/headingUtils';
import {
  cleanupMdProcessor,
  normalizeAsterisk,
  normalizeQuotes,
  normalizeWhitespace,
  removeBulletEscape,
  removeMdHr,
  removeMdImgs,
  removeMdLinks,
  removeRedundantSpaces,
  splitParagraph,
  stripMd,
} from '@/lib/md/mdUtils';
import { parseMd } from '@/lib/md/remark';
import { type GetPageContentFunction } from '@/lib/nlp/crawler';
import { getPageId, getSentenceId } from '@/lib/nlp/getId';
import { type SingleLanguageSentence } from '@/lib/nlp/schema';

const getPageContent = (async ({ resourceHref, chapterParams }) => {
  const { href } = resourceHref;

  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  await retry(
    async () => {
      await page.goto(href);
    },
    {
      retries: 5,
    },
  );

  const bodyHtml = await page
    .locator('article')
    .locator('div[class*="post_content"]')
    .innerHTML();

  await context.close();
  await browser.close();

  const md = await parseMd(bodyHtml);

  const cleanupMd = cleanupMdProcessor(md, [
    removeMdImgs,
    (str) =>
      removeMdLinks(str, {
        useLinkAsAlt: false,
      }),
    removeMdHr,
    removeBulletEscape,
    // NOTE: Have to run first so the asterisk regex can match correctly
    normalizeWhitespace,
    normalizeAsterisk,
    normalizeQuotes,
    removeRedundantSpaces,
  ]);

  const paragraphs = splitParagraph(cleanupMd, {
    headingAsParagraph: false,
  });

  const pageData = paragraphs.map((p, paragraphIdx) => {
    const pageNumber = paragraphIdx + 1;

    const paragraphId = getPageId({
      ...chapterParams,
      pageNumber,
    });

    const paragraphHeadings = extractHeading(p);

    // NOTE: If there are any headings in the paragraph, we will remove them
    p = removeAllHeading(p);

    const stripParagraph = stripMd(p).trim();

    // NOTE: Have to split markdown paragraphs by `\\\n` from markdown before
    // splitting sentences
    const sentences = stripParagraph
      .split('\\\n')
      .flatMap((subP) => sentencize(subP))
      .map((sentence) => {
        return {
          type: 'single',
          text: removeAllFootnote(sentence),
        } satisfies Omit<SingleLanguageSentence, 'id' | 'footnotes'>;
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
          footnotes: [],
          headings:
            sentenceNumber === 0
              ? paragraphHeadings.map((heading) => ({
                  ...heading,
                  text: stripMd(heading.text).trim(),
                  sentenceId: newSentenceId,
                }))
              : [],
        } satisfies SingleLanguageSentence;
      });

    return {
      id: paragraphId,
      number: pageNumber,
      sentences,
    };
  });

  return pageData;
}) satisfies GetPageContentFunction;

export { getPageContent };
