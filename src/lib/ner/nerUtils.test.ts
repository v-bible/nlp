import { describe, expect, test } from 'vitest';
import { resolveOverlapAnnotation, wrapNERLabel } from '@/lib/ner/nerUtils';
import { type EntityAnnotation } from '@/lib/ner/schema';

describe('wrapNERLabel', () => {
  test('should handle non-overlapping annotations', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const annotations: EntityAnnotation[] = [
      { start: 0, end: 3, text: 'The', labels: ['PER'], id: '1' },
      { start: 4, end: 9, text: 'quick', labels: ['LOC'], id: '2' },
      { start: 10, end: 15, text: 'brown', labels: ['ORG'], id: '3' },
    ];
    const expected =
      '<PER ID="1">The</PER> <LOC ID="2">quick</LOC> <ORG ID="3">brown</ORG> fox jumps over the lazy dog.';

    const result = wrapNERLabel(text, annotations);
    expect(result).toBe(expected);
  });

  test('should handle overlapping annotations', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const annotations: EntityAnnotation[] = [
      { start: 0, end: 3, text: 'The', labels: ['PER'], id: '1' },
      {
        start: 4,
        end: 19,
        text: 'quick brown fox',
        labels: ['LOC'],
        id: '2',
      },
      {
        start: 10,
        end: 25,
        text: 'brown fox jumps',
        labels: ['ORG'],
        id: '3',
      },
    ];
    const expected =
      '<PER ID="1">The</PER> <LOC ID="2">quick </LOC><ORG ID="3"><LOC ID="2">brown fox</LOC> jumps</ORG> over the lazy dog.';

    const result = wrapNERLabel(text, annotations);
    expect(result).toBe(expected);
  });

  test('should handle contained annotations', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const annotations: EntityAnnotation[] = [
      { start: 0, end: 3, text: 'The', labels: ['PER'], id: '1' },
      {
        start: 4,
        end: 25,
        text: 'quick brown fox jumps',
        labels: ['LOC'],
        id: '2',
      },
      {
        start: 10,
        end: 19,
        text: 'brown fox',
        labels: ['ORG'],
        id: '3',
      },
    ];
    const expected =
      '<PER ID="1">The</PER> <LOC ID="2">quick <ORG ID="3">brown fox</ORG> jumps</LOC> over the lazy dog.';

    const result = wrapNERLabel(text, annotations);
    expect(result).toBe(expected);
  });

  test('should return original text when no annotations are provided', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const annotations: EntityAnnotation[] = [];

    const result = wrapNERLabel(text, annotations);
    expect(result).toBe(text);
  });

  test('should handle single annotation', () => {
    const text = 'Hello world';
    const annotations: EntityAnnotation[] = [
      { start: 0, end: 5, text: 'Hello', labels: ['PER'], id: '1' },
    ];
    const expected = '<PER ID="1">Hello</PER> world';

    const result = wrapNERLabel(text, annotations);
    expect(result).toBe(expected);
  });
});

describe('resolveOverlapAnnotation', () => {
  test('should handle non-overlapping annotations', () => {
    const annotations: EntityAnnotation[] = [
      {
        start: 0,
        end: 3,
        text: 'The',
        labels: ['PER'],
        id: '1',
      },
      {
        start: 4,
        end: 9,
        text: 'quick',
        labels: ['LOC'],
        id: '2',
      },
      {
        start: 10,
        end: 15,
        text: 'brown',
        labels: ['ORG'],
        id: '3',
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
      id: '1',
    });
    expect(result[1]).toEqual({
      start: 4,
      end: 9,
      text: 'quick',
      labels: ['LOC'],
      id: '2',
    });
    expect(result[2]).toEqual({
      start: 10,
      end: 15,
      text: 'brown',
      labels: ['ORG'],
      id: '3',
    });
  });

  test('should resolve overlapping annotations with overlapKeepRight=true', () => {
    const annotations: EntityAnnotation[] = [
      {
        start: 4,
        end: 19,
        text: 'quick brown fox',
        labels: ['LOC'],
        id: '2',
      },
      {
        start: 10,
        end: 25,
        text: 'brown fox jumps',
        labels: ['ORG'],
        id: '3',
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
      id: '2',
    });

    // Original overlapping annotation
    expect(result[1]).toEqual({
      start: 10,
      end: 25,
      text: 'brown fox jumps',
      labels: ['ORG'],
      id: '3',
    });

    // Second part of split annotation
    expect(result[2]).toEqual({
      start: 10,
      end: 19,
      text: 'brown fox',
      labels: ['LOC'],
      id: '2',
    });
  });

  test('should handle contained annotations', () => {
    const annotations: EntityAnnotation[] = [
      {
        start: 4,
        end: 25,
        text: 'quick brown fox jumps',
        labels: ['LOC'],
        id: '2',
      },
      {
        start: 10,
        end: 19,
        text: 'brown fox',
        labels: ['ORG'],
        id: '3',
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
    const annotations: EntityAnnotation[] = [];

    const result = resolveOverlapAnnotation(annotations, {
      overlapKeepRight: true,
    });

    expect(result).toEqual([]);
  });

  test('should handle single annotation', () => {
    const annotations: EntityAnnotation[] = [
      {
        start: 0,
        end: 5,
        text: 'Hello',
        labels: ['PER'],
        id: '1',
      },
    ];

    const result = resolveOverlapAnnotation(annotations, {
      overlapKeepRight: true,
    });

    expect(result).toEqual(annotations);
  });
});
