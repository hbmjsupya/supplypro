import { describe, it, expect, vi, afterEach } from 'vitest';
import dayjs from 'dayjs';
import { formatTimeSmart, formatTimeFull } from '../dateFormatter';

describe('dateFormatter', () => {
  const mockNow = new Date('2023-10-27T14:30:00');

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  describe('formatTimeSmart', () => {
    it('returns "-" for invalid or empty input', () => {
      expect(formatTimeSmart(null)).toBe('-');
      expect(formatTimeSmart(undefined)).toBe('-');
      expect(formatTimeSmart('invalid-date')).toBe('-');
    });

    it('formats time within 24 hours as relative time', () => {
      // 2 hours ago
      const twoHoursAgo = dayjs(mockNow).subtract(2, 'hour').toISOString();
      // Since locale is zh-cn, expect Chinese output
      // "2小时前"
      expect(formatTimeSmart(twoHoursAgo)).toMatch(/小时前/);
      
      // Just now (1 minute ago)
      const justNow = dayjs(mockNow).subtract(1, 'minute').toISOString();
      expect(formatTimeSmart(justNow)).toMatch(/分钟前|秒前/);
    });

    it('formats yesterday correctly', () => {
      const yesterday = dayjs(mockNow).subtract(1, 'day').hour(10).minute(0).toISOString();
      // "昨天 10:00"
      expect(formatTimeSmart(yesterday)).toBe('昨天 10:00');
    });

    it('formats current year dates as MM-DD HH:mm', () => {
      // 2 days ago (not yesterday)
      const twoDaysAgo = dayjs(mockNow).subtract(2, 'day').hour(9).minute(30).toISOString();
      expect(formatTimeSmart(twoDaysAgo)).toBe('10-25 09:30');
    });

    it('formats past year dates as YYYY-MM-DD', () => {
      const lastYear = dayjs(mockNow).subtract(1, 'year').toISOString();
      expect(formatTimeSmart(lastYear)).toBe('2022-10-27');
    });
  });

  describe('formatTimeFull', () => {
    it('formats valid date to full string', () => {
      const date = '2023-10-27T10:00:00';
      expect(formatTimeFull(date)).toBe('2023-10-27 10:00:00');
    });

    it('returns "-" for invalid input', () => {
      expect(formatTimeFull(null)).toBe('-');
    });
  });
});
