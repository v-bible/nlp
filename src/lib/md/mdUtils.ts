import { remark } from 'remark';
import stripMarkdown from 'strip-markdown';
import { reHeading } from './headingUtils';

export const reMdImg = /!\[(?<alt>[^\]]*)\]\((?<link>[^)]*)\)/gm;
export const reMdLink = /\[(?<alt>[^\]]*)\]\((?<link>[^)]*)\)/gm;
export const reMdHr = /^\n*[-*_\s]{1,}\n*$/gm;
export const reParagraphDelimiter = /\n{2,}/gm;
export const reBulletEscape = /^ *\d+\\\.\s/gm;

const removeMdImgs = (
  text: string,
  options?: {
    keepAlt?: boolean;
    useLinkAsAlt?: boolean;
  },
): string => {
  const { keepAlt = false, useLinkAsAlt = true } = options || {};

  return text.replaceAll(reMdImg, (subStr, ...props) => {
    // NOTE: alt is the first capturing group, link is the second
    const alt = props[0];
    const link = props[1];
    if (!keepAlt) {
      return '';
    }
    if (alt) {
      return alt;
    }
    return useLinkAsAlt ? link : '';
  });
};

const removeMdLinks = (
  text: string,
  options?: {
    useLinkAsAlt?: boolean;
  },
): string => {
  const { useLinkAsAlt = true } = options || {};

  return text.replaceAll(reMdLink, (subStr, ...props) => {
    // NOTE: alt is the first capturing group, link is the second
    const alt = props[0];
    const link = props[1];
    if (alt) {
      return alt;
    }
    return useLinkAsAlt ? link : '';
  });
};

const removeMdHr = (text: string): string => {
  return text.replaceAll(reMdHr, '');
};

const removeBulletEscape = (text: string): string => {
  return text.replaceAll(reBulletEscape, (subStr) => {
    return subStr.replace('\\', '');
  });
};

const normalizeAsterisk = (text: string): string => {
  const reAsteriskOnePair = /([*_]{1})( *)(?<text>[^*_\n]+)([*_]{1})/gm;
  const reAsteriskTwoPair = /([*_]{2})( *)(?<text>[^*_\n]+)([*_]{2})/gm;
  const reAsteriskThreePair = /([*_]{3})( *)(?<text>[^*_\n]+)([*_]{3})/gm;

  // NOTE: Have to do from the most nested to the least nested.
  const regex = [reAsteriskThreePair, reAsteriskTwoPair, reAsteriskOnePair];

  return regex.reduce((acc, re) => {
    return acc.replaceAll(re, (subStr, ...props) => {
      const leftAsterisk = props[0] as string;
      const leftPad = props[1] as string;
      const rightAsterisk = props[3] as string;
      // NOTE: text is the third capturing group
      const textGr = props[2] as string;
      // NOTE: Because we must including spaces in text group, to calculate
      // rightPad, we minus the text group with trimEnd method
      const rightPad = ' '.repeat(textGr.length - textGr.trimEnd().length);

      return `${leftPad}${leftAsterisk}${textGr.trimEnd()}${rightAsterisk}${rightPad}`;
    });
  }, text);
};

const normalizeWhitespace = (text: string): string => {
  // Normalize all non-breaking spaces to regular spaces
  return text
    .replaceAll('\u00A0', ' ') // No-Break Space
    .replaceAll('\u2000', ' ') // En Quad
    .replaceAll('\u2001', ' ') // Em Quad
    .replaceAll('\u2002', ' ') // En Space
    .replaceAll('\u2003', ' ') // Em Space
    .replaceAll('\u2004', ' ') // Three-Per-Em Space
    .replaceAll('\u2005', ' ') // Four-Per-Em Space
    .replaceAll('\u2006', ' ') // Six-Per-Em Space
    .replaceAll('\u2007', ' ') // Figure Space
    .replaceAll('\u2008', ' ') // Punctuation Space
    .replaceAll('\u2009', ' ') // Thin Space
    .replaceAll('\u200A', ' ') // Hair Space
    .replaceAll('\u200B', '') // Zero Width Space (remove)
    .replaceAll('\u200C', '') // Zero Width Non-Joiner (remove)
    .replaceAll('\u200D', '') // Zero Width Joiner (remove)
    .replaceAll('\u202F', ' ') // Narrow No-Break Space
    .replaceAll('\u205F', ' ') // Medium Mathematical Space
    .replaceAll('\u3000', ' '); // Ideographic Space
};

const splitParagraph = (
  text: string,
  options?: {
    headingAsParagraph?: boolean;
  },
): string[] => {
  const { headingAsParagraph = true } = options || {};

  const paragraphs = text
    .split(reParagraphDelimiter)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (!headingAsParagraph) {
    let headings: string[] = [];
    let newParagraphs: string[] = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const p of paragraphs) {
      const isHeading = [...p.matchAll(reHeading)].length > 0;

      if (isHeading) {
        headings = [...headings, p];
      } else {
        // NOTE: We will concat headings with paragraphs
        newParagraphs = [...newParagraphs, [headings.join('\n'), p].join('\n')];

        headings = [];
      }
    }

    return newParagraphs.map((p) => p.trim());
  }

  return paragraphs.map((p) => p.trim());
};

const stripMd = (text: string): string => {
  return remark().use(stripMarkdown).processSync(text).toString();
};

const cleanupMdProcessor = (
  text: string,
  cleanupFn: ((str: string) => string)[],
): string => {
  return cleanupFn.reduce((acc, fn) => fn(acc), text);
};

export {
  removeMdImgs,
  removeMdLinks,
  removeMdHr,
  removeBulletEscape,
  normalizeAsterisk,
  normalizeWhitespace,
  splitParagraph,
  stripMd,
  cleanupMdProcessor,
};
