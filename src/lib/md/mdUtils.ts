import { remark } from 'remark';
import stripMarkdown from 'strip-markdown';
import { reHeading } from '@/lib/md/headingUtils';

export const reMdImg = /!\[(?<alt>[^\]]*)\]\((?<link>[^)]*)\)/gm;
export const reMdLink = /\[(?<alt>[^\]]*)\]\((?<link>[^)]*)\)/gm;
export const reMdHr = /^\n*[-*_\s]{1,}\n*$/gm;
export const reParagraphDelimiter = /\n{2,}/gm;
export const reBulletEscape = /^ *\d+\\\.\s/gm;
export const reQuoteSpaces = /" *(?<text>(?:[^"\\]|\\.)*?) *"/gm;
export const reRoundBrackets = /\( *(?<text>[^)]*?) *\)/gm;
export const reSquareBrackets = /\[ *(?<text>[^\]]*?) *\]/gm;
export const reCurlyBrackets = /\{ *(?<text>[^}]*?) *\}/gm;
// Match ***text*** or ___text___ (strong + italic)
export const reAsteriskThreePair = /([*_]{3}) *(?<text>[^*_][^]*?[^*_]?) *\1/gm;
// Match **text** or __text__ (strong)
export const reAsteriskTwoPair = /([*_]{2}) *(?<text>[^*_][^]*?[^*_]?) *\1/gm;
// Match *text* or _text_ (italic)
export const reAsteriskOnePair = /([*_]) *(?<text>[^*_][^]*?[^*_]?) *\1/gm;

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

const removeRedundantSpaces = (text: string): string => {
  return text
    .replaceAll(reQuoteSpaces, (subStr, ...props) => {
      // NOTE: text is the first capturing group
      const textGr = props[0] as string;
      return `"${textGr.trim()}"`;
    })
    .replaceAll(reRoundBrackets, (subStr, ...props) => {
      // NOTE: text is the first capturing group
      const textGr = props[0] as string;
      return `(${textGr.trim()})`;
    })
    .replaceAll(reSquareBrackets, (subStr, ...props) => {
      // NOTE: text is the first capturing group
      const textGr = props[0] as string;
      return `[${textGr.trim()}]`;
    })
    .replaceAll(reCurlyBrackets, (subStr, ...props) => {
      // NOTE: text is the first capturing group
      const textGr = props[0] as string;
      return `{${textGr.trim()}}`;
    });
};

const normalizeAsterisk = (text: string): string => {
  // NOTE: We go from most nested to least nested: *** → ** → *
  const regexes = [reAsteriskThreePair, reAsteriskTwoPair, reAsteriskOnePair];

  return regexes.reduce((acc, re) => {
    return acc.replaceAll(re, (subStr, ...props) => {
      // Group captures:
      const marker = props[0] as string; // the * or _ marker (*, **, ***)
      const textGr = props[1] as string; // the "text" inside the markers

      // We remove trailing space inside the emphasis text, but preserve spacing outside
      const trimmed = textGr.trimEnd();
      const rightPad = ' '.repeat(textGr.length - trimmed.length);

      return `${marker}${trimmed}${marker}${rightPad}`;
    });
  }, text);
};

const normalizeQuotes = (text: string): string => {
  return (
    text
      // Normalize all smart double quotes to straight double
      .replaceAll('“', '"')
      .replaceAll('”', '"')
      .replaceAll('„', '"')
      .replaceAll('‟', '"')
      .replaceAll('″', '"')
      .replaceAll('‶', '"')
      .replaceAll('"', '"') // for consistency; optional

      // Normalize all smart single quotes to straight single
      .replaceAll('‘', "'")
      .replaceAll('’', "'")
      .replaceAll('‚', "'")
      .replaceAll('‛', "'")
      .replaceAll('′', "'")
      .replaceAll('‵', "'")
      .replaceAll("'", "'") // for consistency; optional
  );
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
  removeRedundantSpaces,
  normalizeQuotes,
  normalizeAsterisk,
  normalizeWhitespace,
  splitParagraph,
  stripMd,
  cleanupMdProcessor,
};
