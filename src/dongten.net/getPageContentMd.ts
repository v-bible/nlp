/* eslint-disable no-restricted-syntax */
/* eslint-disable no-continue */
import retry from 'async-retry';
import { chromium, devices } from 'playwright';
import {
  cleanupMdProcessor,
  normalizeAsterisk,
  normalizeMd,
  normalizeNumberBullet,
  normalizeQuotes,
  normalizeWhitespace,
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

  const bodyLocator = page
    .locator('div[class*="post-inner"]')
    .locator('div[class*="entry"]');

  await bodyLocator.evaluate((node) => {
    // NOTE: Remove post share buttons
    node.querySelector('div[class*="share-post"]')?.remove();
  });

  const bodyHtml = await bodyLocator.innerHTML();

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
    // NOTE: Have to run first so the asterisk regex can match correctly
    normalizeWhitespace,
    normalizeAsterisk,
    normalizeQuotes,
    normalizeNumberBullet,
    normalizeMd,
    removeRedundantSpaces,
  ]);

  return cleanupMd.trim();
}) satisfies GetPageContentMdFunction;

export { getPageContentMd };
