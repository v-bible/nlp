import retry from 'async-retry';
import { chromium, devices } from 'playwright';
import { type GetPageContentFunction } from '@/lib/nlp/crawler';
import { type Page } from '@/lib/nlp/schema';
import { parseMd } from '@/lib/remark';

const getPageContent = (async ({ resourceHref }) => {
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
    .locator('div[class="detail-article main-content" i] > div')
    .innerHTML();

  const md = await parseMd(bodyHtml);
  console.log('md', md);

  await context.close();
  await browser.close();

  return Promise.resolve([
    {
      id: '01',
      number: 1,
      sentences: [
        {
          id: '02',
          text: 'hello',
        },
      ],
    },
  ] satisfies Page[]);
}) satisfies GetPageContentFunction;

export { getPageContent };
