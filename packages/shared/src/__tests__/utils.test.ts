import { describe, expect, test, beforeEach, mock } from 'bun:test';
import {
  estimateTokens,
  truncateToTokens,
  formatNumber,
  formatBytes,
  formatDuration,
  sleep,
  debounce,
  throttle,
  generateId,
  deepClone,
  isValidJson,
  safeJsonParse,
  chunk,
  unique,
  capitalize,
  toKebabCase,
  toCamelCase,
  retry,
} from '../utils.js';

describe('estimateTokens', () => {
  test('approximates ~4 chars per token', () => {
    expect(estimateTokens('test')).toBe(1);
    expect(estimateTokens('testtest')).toBe(2);
    expect(estimateTokens('hello world')).toBe(3); // 11 chars = ceil(11/4) = 3
  });

  test('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  test('rounds up for partial tokens', () => {
    expect(estimateTokens('hello')).toBe(2); // 5 chars = ceil(5/4) = 2
  });
});

describe('truncateToTokens', () => {
  test('returns original if under limit', () => {
    expect(truncateToTokens('hello', 10)).toBe('hello');
  });

  test('truncates and adds ... if over limit', () => {
    const longText = 'a'.repeat(100);
    const result = truncateToTokens(longText, 5); // 5 tokens = 20 chars
    expect(result.length).toBe(20); // 17 chars + '...'
    expect(result.endsWith('...')).toBe(true);
  });

  test('handles exact limit', () => {
    const text = 'a'.repeat(20); // 20 chars = 5 tokens
    expect(truncateToTokens(text, 5)).toBe(text);
  });
});

describe('formatNumber', () => {
  test('adds commas for thousands', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  test('handles small numbers', () => {
    expect(formatNumber(100)).toBe('100');
    expect(formatNumber(0)).toBe('0');
  });

  test('handles negative numbers', () => {
    expect(formatNumber(-1000)).toBe('-1,000');
  });
});

describe('formatBytes', () => {
  test('formats bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(500)).toBe('500 B');
  });

  test('formats KB correctly', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  test('formats MB correctly', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
  });

  test('formats GB correctly', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
  });
});

describe('formatDuration', () => {
  test('formats milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms');
  });

  test('formats seconds', () => {
    expect(formatDuration(1500)).toBe('1.5s');
    expect(formatDuration(30000)).toBe('30.0s');
  });

  test('formats minutes and seconds', () => {
    expect(formatDuration(90000)).toBe('1m 30s');
    expect(formatDuration(120000)).toBe('2m 0s');
  });
});

describe('sleep', () => {
  test('waits for specified duration', async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some tolerance
    expect(elapsed).toBeLessThan(100);
  });
});

describe('debounce', () => {
  test('delays function execution', async () => {
    let callCount = 0;
    const fn = debounce(() => callCount++, 50);

    fn();
    fn();
    fn();

    expect(callCount).toBe(0);
    await sleep(100);
    expect(callCount).toBe(1);
  });

  test('only executes last call', async () => {
    const results: number[] = [];
    const fn = debounce((n: number) => results.push(n), 50);

    fn(1);
    fn(2);
    fn(3);

    await sleep(100);
    expect(results).toEqual([3]);
  });
});

describe('throttle', () => {
  test('limits rate of function calls', async () => {
    let callCount = 0;
    const fn = throttle(() => callCount++, 50);

    fn(); // Should execute
    fn(); // Should be throttled
    fn(); // Should be throttled

    expect(callCount).toBe(1);

    await sleep(60);
    fn(); // Should execute
    expect(callCount).toBe(2);
  });
});

describe('generateId', () => {
  test('generates ID of correct length', () => {
    expect(generateId().length).toBe(8);
    expect(generateId(16).length).toBe(16);
  });

  test('uses only alphanumeric characters', () => {
    const id = generateId(100);
    expect(/^[a-z0-9]+$/.test(id)).toBe(true);
  });

  test('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('deepClone', () => {
  test('clones objects', () => {
    const original = { a: 1, b: { c: 2 } };
    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.b).not.toBe(original.b);
  });

  test('clones arrays', () => {
    const original = [1, [2, 3], { a: 4 }];
    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
  });

  test('creates independent copy', () => {
    const original = { a: { b: 1 } };
    const cloned = deepClone(original);

    cloned.a.b = 2;
    expect(original.a.b).toBe(1);
  });
});

describe('isValidJson', () => {
  test('returns true for valid JSON', () => {
    expect(isValidJson('{}')).toBe(true);
    expect(isValidJson('[]')).toBe(true);
    expect(isValidJson('{"a":1}')).toBe(true);
    expect(isValidJson('"string"')).toBe(true);
    expect(isValidJson('123')).toBe(true);
    expect(isValidJson('null')).toBe(true);
  });

  test('returns false for invalid JSON', () => {
    expect(isValidJson('')).toBe(false);
    expect(isValidJson('{')).toBe(false);
    expect(isValidJson('{a:1}')).toBe(false);
    expect(isValidJson('undefined')).toBe(false);
  });
});

describe('safeJsonParse', () => {
  test('parses valid JSON', () => {
    expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 });
    expect(safeJsonParse('[1,2,3]', [])).toEqual([1, 2, 3]);
  });

  test('returns default on error', () => {
    expect(safeJsonParse('invalid', { fallback: true })).toEqual({ fallback: true });
    expect(safeJsonParse('', [])).toEqual([]);
  });
});

describe('chunk', () => {
  test('splits array into chunks', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });

  test('handles empty array', () => {
    expect(chunk([], 2)).toEqual([]);
  });

  test('handles chunk size larger than array', () => {
    expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
  });
});

describe('unique', () => {
  test('removes duplicates', () => {
    expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
  });

  test('handles strings', () => {
    expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
  });

  test('handles empty array', () => {
    expect(unique([])).toEqual([]);
  });

  test('preserves order of first occurrence', () => {
    expect(unique([3, 1, 2, 1, 3])).toEqual([3, 1, 2]);
  });
});

describe('capitalize', () => {
  test('capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('world')).toBe('World');
  });

  test('handles empty string', () => {
    expect(capitalize('')).toBe('');
  });

  test('handles already capitalized', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });
});

describe('toKebabCase', () => {
  test('converts camelCase', () => {
    expect(toKebabCase('helloWorld')).toBe('hello-world');
    expect(toKebabCase('myVariableName')).toBe('my-variable-name');
  });

  test('converts spaces and underscores', () => {
    expect(toKebabCase('hello world')).toBe('hello-world');
    expect(toKebabCase('hello_world')).toBe('hello-world');
  });
});

describe('toCamelCase', () => {
  test('converts kebab-case', () => {
    expect(toCamelCase('hello-world')).toBe('helloWorld');
    expect(toCamelCase('my-variable-name')).toBe('myVariableName');
  });

  test('converts snake_case', () => {
    expect(toCamelCase('hello_world')).toBe('helloWorld');
  });

  test('converts spaces', () => {
    expect(toCamelCase('hello world')).toBe('helloWorld');
  });
});

describe('retry', () => {
  test('returns on first success', async () => {
    let attempts = 0;
    const result = await retry(async () => {
      attempts++;
      return 'success';
    });

    expect(result).toBe('success');
    expect(attempts).toBe(1);
  });

  test('retries on failure', async () => {
    let attempts = 0;
    const result = await retry(
      async () => {
        attempts++;
        if (attempts < 3) throw new Error('fail');
        return 'success';
      },
      { maxAttempts: 3, delayMs: 10 }
    );

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  test('throws after max attempts', async () => {
    let attempts = 0;
    await expect(
      retry(
        async () => {
          attempts++;
          throw new Error('always fails');
        },
        { maxAttempts: 3, delayMs: 10 }
      )
    ).rejects.toThrow('always fails');

    expect(attempts).toBe(3);
  });

  test('calls onRetry callback', async () => {
    const retries: number[] = [];
    try {
      await retry(
        async () => {
          throw new Error('fail');
        },
        {
          maxAttempts: 3,
          delayMs: 10,
          onRetry: (attempt) => retries.push(attempt),
        }
      );
    } catch {}

    expect(retries).toEqual([1, 2]);
  });

  test('uses exponential backoff', async () => {
    const times: number[] = [];
    const startTime = Date.now();

    try {
      await retry(
        async () => {
          times.push(Date.now() - startTime);
          throw new Error('fail');
        },
        { maxAttempts: 3, delayMs: 20, backoffMultiplier: 2 }
      );
    } catch {}

    // First attempt immediate, second after ~20ms, third after ~40ms more
    expect(times.length).toBe(3);
    expect(times[1]).toBeGreaterThanOrEqual(15);
    expect(times[2]).toBeGreaterThanOrEqual(55); // 20 + 40 = 60, allow tolerance
  });
});
