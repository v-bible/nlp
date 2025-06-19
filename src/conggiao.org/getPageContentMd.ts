/* eslint-disable no-restricted-syntax */
/* eslint-disable no-continue */
import retry from 'async-retry';
import { chromium, devices } from 'playwright';
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
} from '@/lib/md/mdUtils';
import { parseMd } from '@/lib/md/remark';
import { type GetPageContentMdFunction } from '@/lib/nlp/crawler';

const getPageContentMd = (async ({ resourceHref }) => {
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

  return cleanupMd;
}) satisfies GetPageContentMdFunction;

export { getPageContentMd };
