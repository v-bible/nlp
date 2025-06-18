import { type Heading } from '@/lib/nlp/schema';

export const reHeading = /\n?^(?<headingLevel>#+) +(?<text>.*)$\n?/gm;

const extractHeading = (text: string, regex: RegExp = reHeading): Heading[] => {
  const matches = text.matchAll(regex);

  return [...matches].map((match, idx) => {
    const headingLevel = match.groups?.headingLevel?.length ?? 1;
    const headingText = match.groups?.text ?? '';
    return {
      level: headingLevel,
      text: headingText,
      order: idx,
    } satisfies Heading;
  });
};

const removeAllHeading = (text: string, regex: RegExp = reHeading) => {
  return text.replaceAll(regex, '');
};

export { extractHeading, removeAllHeading };
