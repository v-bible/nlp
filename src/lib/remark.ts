import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import rehypeRemoveComments from 'rehype-remove-comments';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

const parseMd = async (html: string) => {
  const file = await unified()
    .use(rehypeParse)
    .use(rehypeRemoveComments)
    .use(rehypeRemark)
    .use(remarkGfm)
    .use(remarkStringify)
    .process(html);

  const parsedContent = String(file);

  return parsedContent;
};

export { parseMd };
