export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getHolidaySet(
  customHolidays: { date: string; type: 'one-off' | 'recurring'; month?: number; day?: number; until?: string }[],
  weekendHoliday: boolean,
  targetYear: number
): Set<string> {
  const set = new Set<string>();

  // Weekend
  if (weekendHoliday) {
    // Add all Saturdays and Sundays for the year
    const start = new Date(targetYear, 0, 1);
    const end = new Date(targetYear + 1, 0, 1);
    let d = new Date(start);
    while (d < end) {
      if (isWeekend(d)) {
        set.add(formatDate(d));
      }
      d = addDays(d, 1);
    }
  }

  // Custom holidays
  for (const h of customHolidays) {
    if (h.type === 'one-off') {
      set.add(h.date);
    } else if (h.type === 'recurring') {
      const month = h.month ?? 1;
      const day = h.day ?? 1;
      const until = h.until ? parseDate(h.until) : null;
      for (let y = targetYear; y <= targetYear + 1; y++) {
        const date = new Date(y, month - 1, day);
        const dateStr = formatDate(date);
        if (until && date > until) break;
        set.add(dateStr);
      }
    }
  }

  return set;
}

export function isWorkingDay(
  date: Date,
  weekendHoliday: boolean,
  holidaySet: Set<string>
): boolean {
  const dateStr = formatDate(date);
  if (holidaySet.has(dateStr)) return false;
  if (weekendHoliday && isWeekend(date)) return false;
  return true;
}

export function addWorkingDays(
  startDate: Date,
  days: number,
  weekendHoliday: boolean,
  holidaySet: Set<string>
): Date {
  if (days <= 0) return new Date(startDate);
  
  let current = new Date(startDate);
  let count = 1; // Start date counts as day 1
  
  // If start date is not a working day, move to next working day
  if (!isWorkingDay(current, weekendHoliday, holidaySet)) {
    current = addDays(current, 1);
    while (!isWorkingDay(current, weekendHoliday, holidaySet)) {
      current = addDays(current, 1);
    }
    count = 1;
  }
  
  while (count < days) {
    current = addDays(current, 1);
    if (isWorkingDay(current, weekendHoliday, holidaySet)) {
      count++;
    }
  }
  
  return current;
}

export function countWorkingDaysBetween(
  start: Date,
  end: Date,
  weekendHoliday: boolean,
  holidaySet: Set<string>
): number {
  if (end <= start) return 0;
  
  let count = 0;
  let current = new Date(start);
  
  // Count both start and end if they are working days
  while (current <= end) {
    if (isWorkingDay(current, weekendHoliday, holidaySet)) {
      count++;
    }
    current = addDays(current, 1);
  }
  
  return count;
}

export function toDateInputValue(date: Date): string {
  return formatDate(date);
}

export function fromDateInputValue(value: string): Date {
  return parseDate(value);
}
