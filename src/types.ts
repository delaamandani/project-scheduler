export interface Project {
  id: string;
  name: string;
  organization: string;
  website: string;
  description: string;
  weekendHoliday: boolean; // true = weekend libur, false = weekend kerja
  customHolidays: Holiday[];
  createdAt: string;
  updatedAt: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string; // ISO date YYYY-MM-DD
  type: 'one-off' | 'recurring';
  // For recurring: day of month, or month+day
  month?: number; // 1-12
  day?: number; // 1-31
  until?: string; // ISO date, optional end for recurring
}

export interface Task {
  id: string;
  name: string;
  startDate: string | null; // ISO date, null if not scheduled
  durationDays: number; // working days
  endDate: string | null; // computed
  priority: 'rendah' | 'sedang' | 'tinggi';
  color: string;
  parentId: string | null;
  resources: string[]; // resource IDs
  dependencies: Dependency[];
  isManualSchedule: boolean; // true if user explicitly set start date
  createdAt: string;
  updatedAt: string;
}

export interface Dependency {
  id: string;
  predecessorId: string;
  successorId: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  delayDays: number; // positive = delay, negative = overlap (negative lag)
}

export interface Resource {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  salary: number | null;
  personalHolidays: string[]; // ISO dates
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleResult {
  taskId: string;
  startDate: string | null;
  endDate: string | null;
  earlyStart: string | null;
  earlyFinish: string | null;
  lateStart: string | null;
  lateFinish: string | null;
  totalFloat: number;
  isCritical: boolean;
}

export interface PathInfo {
  path: string[]; // task IDs
  duration: number;
  isCritical: boolean;
}

export type AppData = {
  project: Project | null;
  tasks: Task[];
  resources: Resource[];
  dependencies: Dependency[];
};
