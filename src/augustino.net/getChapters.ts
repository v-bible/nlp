import retry from 'async-retry';
import { chromium, devices } from 'playwright';
import { type GetChaptersFunction } from '@/lib/nlp/crawler';
import { logger } from '@/logger/logger';

const getChapters = (async ({ resourceHref }) => {
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

  const toc = page.locator('div[class*="tree-toc"]');
  const tocLinks = await toc.getByRole('link').all();

  const links = (
    await Promise.all(
      tocLinks.map(async (linkEl, idx) => {
        const chapterHref = `https://augustino.net/${await linkEl.getAttribute('href')}`;
        const text = (await linkEl.textContent()) || '';

        if (!chapterHref) {
          logger.warn('Chapter link is missing', {
            href,
          });

          return [];
        }

        return [
          {
            href: chapterHref,
            props: {
              chapterNumber: idx + 1,
              chapterName: text,
            },
          } satisfies Awaited<ReturnType<GetChaptersFunction>>[number],
        ];
      }),
    )
  ).flat();

  await context.close();
  await browser.close();

  return links;
}) satisfies GetChaptersFunction;

export { getChapters };
