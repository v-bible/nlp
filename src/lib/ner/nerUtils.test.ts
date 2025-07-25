import { describe, expect, test } from 'vitest';
import { resolveOverlapAnnotation, wrapNERLabel } from '@/lib/ner/nerUtils';
import { type SentenceEntityAnnotation } from '@/lib/ner/schema';

describe('wrapNERLabel', () => {
  test('should handle non-overlapping annotations', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const annotations: SentenceEntityAnnotation[] = [
      {
        start: 0,
        end: 3,
        text: 'The',
        labels: ['PER'],
        sentenceId: 'RCN_001.001.001.01',
        sentenceType: 'single',
        languageCode: '',
      },
      {
        start: 4,
        end: 9,
        text: 'quick',
        labels: ['LOC'],
        sentenceId: 'RCN_001.001.002.01',
        sentenceType: 'single',
        languageCode: '',
      },
      {
        start: 10,
        end: 15,
        text: 'brown',
        labels: ['ORG'],
        sentenceId: 'RCN_001.001.003.01',
        sentenceType: 'single',
        languageCode: '',
      },
    ];
    const expected =
      '<PER SENTENCE_ID="RCN_001.001.001.01" SENTENCE_TYPE="single" LANGUAGE_CODE="">The</PER> <LOC SENTENCE_ID="RCN_001.001.002.01" SENTENCE_TYPE="single" LANGUAGE_CODE="">quick</LOC> <ORG SENTENCE_ID="RCN_001.001.003.01" SENTENCE_TYPE="single" LANGUAGE_CODE="">brown</ORG> fox jumps over the lazy dog.';

    const result = wrapNERLabel(text, annotations);
    expect(result).toBe(expected);
  });

  test('should handle overlapping annotations', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const annotations: SentenceEntityAnnotation[] = [
      {
        start: 0,
        end: 3,
        text: 'The',
        labels: ['PER'],
        sentenceId: 'RCN_001.001.001.01',
        sentenceType: 'single',
        languageCode: '',
      },
      {
        start: 4,
        end: 19,
        text: 'quick brown fox',
        labels: ['LOC'],
        sentenceId: 'RCN_001.001.002.01',
        sentenceType: 'single',
        languageCode: '',
      },
      {
        start: 10,
        end: 25,
        text: 'brown fox jumps',
        labels: ['ORG'],
        sentenceId: 'RCN_001.001.003.01',
        sentenceType: 'single',
        languageCode: '',
      },
    ];
    const expected =
      '<PER SENTENCE_ID="RCN_001.001.001.01" SENTENCE_TYPE="single" LANGUAGE_CODE="">The</PER> <LOC SENTENCE_ID="RCN_001.001.002.01" SENTENCE_TYPE="single" LANGUAGE_CODE="">quick </LOC><ORG SENTENCE_ID="RCN_001.001.003.01" SENTENCE_TYPE="single" LANGUAGE_CODE=""><LOC SENTENCE_ID="RCN_001.001.002.01" SENTENCE_TYPE="single" LANGUAGE_CODE="">brown fox</LOC> jumps</ORG> over the lazy dog.';

    const result = wrapNERLabel(text, annotations);
    expect(result).toBe(expected);
  });

  test('should handle contained annotations', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const annotations: SentenceEntityAnnotation[] = [
      {
        start: 0,
        end: 3,
        text: 'The',
        labels: ['PER'],
        sentenceId: 'RCN_001.001.001.01',
        sentenceType: 'single',
        languageCode: '',
      },
      {
        start: 4,
        end: 25,
        text: 'quick brown fox jumps',
        labels: ['LOC'],
        sentenceId: 'RCN_001.001.002.01',
        sentenceType: 'single',
        languageCode: '',
      },
      {
        start: 10,
        end: 19,
        text: 'brown fox',
        labels: ['ORG'],
        sentenceId: 'RCN_001.001.003.01',
        sentenceType: 'single',
        languageCode: '',
      },
    ];
    const expected =
      '<PER SENTENCE_ID="RCN_001.001.001.01" SENTENCE_TYPE="single" LANGUAGE_CODE="">The</PER> <LOC SENTENCE_ID="RCN_001.001.002.01" SENTENCE_TYPE="single" LANGUAGE_CODE="">quick <ORG SENTENCE_ID="RCN_001.001.003.01" SENTENCE_TYPE="single" LANGUAGE_CODE="">brown fox</ORG> jumps</LOC> over the lazy dog.';

    const result = wrapNERLabel(text, annotations);
    expect(result).toBe(expected);
  });

  test('should return original text when no annotations are provided', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const annotations: SentenceEntityAnnotation[] = [];

    const result = wrapNERLabel(text, annotations);
    expect(result).toBe(text);
  });

  test('should handle single annotation', () => {
    const text = 'Hello world';
    const annotations: SentenceEntityAnnotation[] = [
      {
        start: 0,
        end: 5,
        text: 'Hello',
        labels: ['PER'],
        sentenceId: 'RCN_001.001.001.01',
        sentenceType: 'single',
        languageCode: '',
      },
    ];
    const expected =
      '<PER SENTENCE_ID="RCN_001.001.001.01" SENTENCE_TYPE="single" LANGUAGE_CODE="">Hello</PER> world';

    const result = wrapNERLabel(text, annotations);
    expect(result).toBe(expected);
  });
});

describe('resolveOverlapAnnotation', () => {
  test('should handle non-overlapping annotations', () => {
    const annotations: SentenceEntityAnnotation[] = [
      {
        start: 0,
        end: 3,
        text: 'The',
        labels: ['PER'],
        sentenceId: 'RCN_001.001.001.01',
        sentenceType: 'single',
        languageCode: '',
      },
      {
        start: 4,
        end: 9,
        text: 'quick',
        labels: ['LOC'],
        sentenceId: 'RCN_001.001.002.01',
        sentenceType: 'single',
        languageCode: '',
      },
      {
        start: 10,
        end: 15,
        text: 'brown',
        labels: ['ORG'],
        sentenceId: 'RCN_001.001.003.01',
        sentenceType: 'single',
        languageCode: '',
      },
    ];

    const result = resolveOverlapAnnotation(annotations, {
      overlapKeepRight: true,
    });

    // Should return annotations sorted by start position
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      start: 0,
      end: 3,
      text: 'The',
      labels: ['PER'],
      sentenceId: 'RCN_001.001.001.01',
      sentenceType: 'single',
      languageCode: '',
    });
    expect(result[1]).toEqual({
      start: 4,
      end: 9,
      text: 'quick',
      labels: ['LOC'],
      sentenceId: 'RCN_001.001.002.01',
      sentenceType: 'single',
      languageCode: '',
    });
    expect(result[2]).toEqual({
      start: 10,
      end: 15,
      text: 'brown',
      labels: ['ORG'],
      sentenceId: 'RCN_001.001.003.01',
      sentenceType: 'single',
      languageCode: '',
    });
  });

  test('should resolve overlapping annotations with overlapKeepRight=true', () => {
    const annotations: SentenceEntityAnnotation[] = [
      {
        start: 4,
        end: 19,
        text: 'quick brown fox',
        labels: ['LOC'],
        sentenceId: 'RCN_001.001.002.01',
        sentenceType: 'single',
        languageCode: '',
      },
      {
        start: 10,
        end: 25,
        text: 'brown fox jumps',
        labels: ['ORG'],
        sentenceId: 'RCN_001.001.003.01',
        sentenceType: 'single',
        languageCode: '',
      },
    ];

    const result = resolveOverlapAnnotation(annotations, {
      overlapKeepRight: true,
    });

    // Should split the first annotation and keep the overlapping part
    expect(result).toHaveLength(3);

    // Results should be sorted by start position
    // First part of split annotation
    expect(result[0]).toEqual({
      start: 4,
      end: 10,
      text: 'quick ',
      labels: ['LOC'],
      sentenceId: 'RCN_001.001.002.01',
      sentenceType: 'single',
      languageCode: '',
    });

    // Original overlapping annotation
    expect(result[1]).toEqual({
      start: 10,
      end: 25,
      text: 'brown fox jumps',
      labels: ['ORG'],
      sentenceId: 'RCN_001.001.003.01',
      sentenceType: 'single',
      languageCode: '',
    });

    // Second part of split annotation
    expect(result[2]).toEqual({
      start: 10,
      end: 19,
      text: 'brown fox',
      labels: ['LOC'],
      sentenceId: 'RCN_001.001.002.01',
      sentenceType: 'single',
      languageCode: '',
    });
  });

  test('should handle contained annotations', () => {
    const annotations: SentenceEntityAnnotation[] = [
      {
        start: 4,
        end: 25,
        text: 'quick brown fox jumps',
        labels: ['LOC'],
        sentenceId: 'RCN_001.001.002.01',
        sentenceType: 'single',
        languageCode: '',
      },
      {
        start: 10,
        end: 19,
        text: 'brown fox',
        labels: ['ORG'],
        sentenceId: 'RCN_001.001.003.01',
        sentenceType: 'single',
        languageCode: '',
      },
    ];

    const result = resolveOverlapAnnotation(annotations, {
      overlapKeepRight: true,
    });

    // Contained annotations should not be split
    expect(result).toHaveLength(2);
    expect(result).toEqual(annotations.sort((a, b) => a.start - b.start));
  });

  test('should handle empty annotations array', () => {
    const annotations: SentenceEntityAnnotation[] = [];

    const result = resolveOverlapAnnotation(annotations, {
      overlapKeepRight: true,
    });

    expect(result).toEqual([]);
  });

  test('should handle single annotation', () => {
    const annotations: SentenceEntityAnnotation[] = [
      {
        start: 0,
        end: 5,
        text: 'Hello',
        labels: ['PER'],
        sentenceId: 'RCN_001.001.001.01',
        sentenceType: 'single',
        languageCode: '',
      },
    ];

    const result = resolveOverlapAnnotation(annotations, {
      overlapKeepRight: true,
    });

    expect(result).toEqual(annotations);
  });
});
