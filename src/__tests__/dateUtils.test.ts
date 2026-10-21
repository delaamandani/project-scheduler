import {
  isWeekend,
  formatDate,
  parseDate,
  addDays,
  addWorkingDays,
  isWorkingDay,
  getHolidaySet,
  countWorkingDaysBetween,
  isSameDay,
} from '../utils/dateUtils';

describe('Date Utilities', () => {
  describe('isWeekend', () => {
    it('should return true for Saturday', () => {
      const saturday = new Date(2025, 0, 4); // Jan 4, 2025 is Saturday
      expect(isWeekend(saturday)).toBe(true);
    });

    it('should return true for Sunday', () => {
      const sunday = new Date(2025, 0, 5); // Jan 5, 2025 is Sunday
      expect(isWeekend(sunday)).toBe(true);
    });

    it('should return false for Monday', () => {
      const monday = new Date(2025, 0, 6); // Jan 6, 2025 is Monday
      expect(isWeekend(monday)).toBe(false);
    });

    it('should return false for Wednesday', () => {
      const wednesday = new Date(2025, 2, 12); // Mar 12, 2025 is Wednesday
      expect(isWeekend(wednesday)).toBe(false);
    });
  });

  describe('isSameDay', () => {
    it('should return true for same date', () => {
      const d1 = new Date(2025, 0, 15);
      const d2 = new Date(2025, 0, 15);
      expect(isSameDay(d1, d2)).toBe(true);
    });

    it('should return false for different dates', () => {
      const d1 = new Date(2025, 0, 15);
      const d2 = new Date(2025, 0, 16);
      expect(isSameDay(d1, d2)).toBe(false);
    });
  });

  describe('formatDate', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date(2025, 5, 15); // June 15, 2025
      expect(formatDate(date)).toBe('2025-06-15');
    });

    it('should zero-pad month and day', () => {
      const date = new Date(2025, 0, 5); // Jan 5, 2025
      expect(formatDate(date)).toBe('2025-01-05');
    });
  });

  describe('parseDate', () => {
    it('should parse YYYY-MM-DD string', () => {
      const date = parseDate('2025-06-15');
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(5); // June is month 5 (0-indexed)
      expect(date.getDate()).toBe(15);
    });
  });

  describe('addDays', () => {
    it('should add days to a date', () => {
      const date = new Date(2025, 0, 1);
      const result = addDays(date, 5);
      expect(result.getDate()).toBe(6);
    });

    it('should cross month boundaries', () => {
      const date = new Date(2025, 0, 28);
      const result = addDays(date, 5);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(2);
    });
  });

  describe('getHolidaySet', () => {
    it('should include custom one-off holidays', () => {
      const holidays = [
        { date: '2025-07-17', type: 'one-off' as const },
      ];
      const set = getHolidaySet(holidays, true, 2025);
      expect(set.has('2025-07-17')).toBe(true);
    });

    it('should include recurring holidays for all years', () => {
      const holidays = [
        { date: '', type: 'recurring' as const, month: 1, day: 1 }, // Jan 1
      ];
      const set = getHolidaySet(holidays, true, 2025);
      expect(set.has('2025-01-01')).toBe(true);
      expect(set.has('2026-01-01')).toBe(true);
    });

    it('should respect until date for recurring holidays', () => {
      const holidays = [
        { date: '', type: 'recurring' as const, month: 12, day: 25, until: '2025-12-25' },
      ];
      const set = getHolidaySet(holidays, true, 2025);
      expect(set.has('2025-12-25')).toBe(true);
      expect(set.has('2026-12-25')).toBe(false);
    });

    it('should include weekends when weekendHoliday is true', () => {
      const holidays: { date: string; type: 'one-off' | 'recurring'; month?: number; day?: number; until?: string }[] = [];
      const set = getHolidaySet(holidays, true, 2025);
      // Jan 4, 2025 is Saturday
      expect(set.has('2025-01-04')).toBe(true);
      // Jan 5, 2025 is Sunday
      expect(set.has('2025-01-05')).toBe(true);
    });

    it('should NOT include weekends when weekendHoliday is false', () => {
      const holidays: { date: string; type: 'one-off' | 'recurring'; month?: number; day?: number; until?: string }[] = [];
      const set = getHolidaySet(holidays, false, 2025);
      expect(set.has('2025-01-04')).toBe(false); // Saturday
      expect(set.has('2025-01-05')).toBe(false); // Sunday
    });
  });

  describe('isWorkingDay', () => {
    it('should return true for normal weekday with no holidays', () => {
      const date = new Date(2025, 0, 6); // Monday
      const holidaySet = new Set<string>();
      expect(isWorkingDay(date, true, holidaySet)).toBe(true);
    });

    it('should return false for Saturday when weekendHoliday is true', () => {
      const date = new Date(2025, 0, 4); // Saturday
      const holidaySet = new Set<string>();
      expect(isWorkingDay(date, true, holidaySet)).toBe(false);
    });

    it('should return true for Saturday when weekendHoliday is false', () => {
      const date = new Date(2025, 0, 4); // Saturday
      const holidaySet = new Set<string>();
      expect(isWorkingDay(date, false, holidaySet)).toBe(true);
    });

    it('should return false for custom holiday', () => {
      const date = new Date(2025, 6, 17); // July 17, 2025
      const holidaySet = new Set(['2025-07-17']);
      expect(isWorkingDay(date, true, holidaySet)).toBe(false);
    });
  });

  describe('addWorkingDays', () => {
    it('should add working days correctly with no holidays (duration includes start date)', () => {
      const startDate = new Date(2025, 0, 6); // Monday
      const result = addWorkingDays(startDate, 5, true, new Set());
      // Duration 5 working days: Mon is day 1, Tue(2), Wed(3), Thu(4), Fri(5) = Friday
      expect(formatDate(result)).toBe('2025-01-10');
    });

    it('should skip weekends', () => {
      const startDate = new Date(2025, 0, 3); // Friday
      const result = addWorkingDays(startDate, 2, true, new Set());
      // Fri is day 1, skip Sat+Sun, Mon is day 2
      expect(formatDate(result)).toBe('2025-01-06');
    });

    it('should skip custom holidays', () => {
      const startDate = new Date(2025, 6, 16); // July 16, 2025 (Wednesday)
      const holidaySet = new Set(['2025-07-17']); // Thursday is holiday
      const result = addWorkingDays(startDate, 2, true, holidaySet);
      // Wed is day 1, Thu is holiday (skip), Fri is day 2
      expect(formatDate(result)).toBe('2025-07-18');
    });

    it('should return same date for 0 days', () => {
      const startDate = new Date(2025, 0, 6);
      const result = addWorkingDays(startDate, 0, true, new Set());
      expect(formatDate(result)).toBe(formatDate(startDate));
    });

    it('should handle start date that is not a working day', () => {
      const startDate = new Date(2025, 0, 4); // Saturday
      const result = addWorkingDays(startDate, 3, true, new Set());
      // Skip to Monday (first working day = day 1), Tue(2), Wed(3)
      expect(formatDate(result)).toBe('2025-01-08');
    });
  });

  describe('countWorkingDaysBetween', () => {
    it('should count working days between two dates inclusive', () => {
      const start = new Date(2025, 0, 6); // Monday
      const end = new Date(2025, 0, 10); // Friday
      const count = countWorkingDaysBetween(start, end, true, new Set());
      // Mon, Tue, Wed, Thu, Fri = 5 working days inclusive
      expect(count).toBe(5);
    });

    it('should return 0 when end <= start', () => {
      const start = new Date(2025, 0, 10);
      const end = new Date(2025, 0, 6);
      const count = countWorkingDaysBetween(start, end, true, new Set());
      expect(count).toBe(0);
    });

    it('should skip weekends', () => {
      const start = new Date(2025, 0, 3); // Friday
      const end = new Date(2025, 0, 7); // Tuesday
      const count = countWorkingDaysBetween(start, end, true, new Set());
      // Fri(1), Sat(skipped), Sun(skipped), Mon(2), Tue(3) = 3 working days
      expect(count).toBe(3);
    });
  });
});
