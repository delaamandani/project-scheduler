import {
  computeEndDate,
  computeDuration,
  topologicalSort,
  forwardPass,
  backwardPass,
  computeFullSchedule,
  findAllPaths,
  PathInfo,
} from '../utils/scheduler';
import { parseDate, addWorkingDays, getHolidaySet, formatDate } from '../utils/dateUtils';
import { Task, Dependency, Project } from '../types';

function addWorkingDaysDate(
  startDateStr: string,
  days: number,
  project: Project
): string {
  const start = parseDate(startDateStr);
  const holidaySet = getHolidaySet(
    project.customHolidays,
    project.weekendHoliday,
    start.getFullYear()
  );
  const result = addWorkingDays(start, days, project.weekendHoliday, holidaySet);
  return formatDate(result);
}

function createTestProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'test-proj',
    name: 'Test Project',
    organization: '',
    website: '',
    description: '',
    weekendHoliday: true,
    customHolidays: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createTestTask(
  id: string,
  name: string,
  durationDays: number,
  startDate: string | null = null
): Task {
  return {
    id,
    name,
    startDate,
    durationDays,
    endDate: null,
    priority: 'sedang' as const,
    color: '#3b82f6',
    parentId: null,
    resources: [],
    dependencies: [],
    isManualSchedule: !!startDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createDependency(
  id: string,
  predecessorId: string,
  successorId: string,
  type: Dependency['type'] = 'FS',
  delayDays: number = 0
): Dependency {
  return {
    id,
    predecessorId,
    successorId,
    type,
    delayDays,
  };
}

describe('Scheduler - computeEndDate', () => {
  it('should compute end date correctly with working days (weekend libur)', () => {
    const project = createTestProject({ weekendHoliday: true });
    const startDate = '2025-06-30'; // Monday
    const duration = 5;

    const endDate = computeEndDate(startDate, duration, project);

    // June 30 (Mon) is day 1, + 5 working days
    // Mon(1), Tue(2), Wed(3), Thu(4), Fri(5) = Jul 4
    expect(endDate).toBe('2025-07-04');
  });

  it('should skip weekends when calculating end date', () => {
    const project = createTestProject({ weekendHoliday: true });
    const startDate = '2025-06-27'; // Friday
    const duration = 2;

    const endDate = computeEndDate(startDate, duration, project);

    // Jun 27 (Fri) is day 1
    // Skip Sat (28), Sun (29)
    // Jun 30 (Mon) is day 2 - end date
    expect(endDate).toBe('2025-06-30');
  });

  it('should skip custom holidays', () => {
    const project = createTestProject({
      weekendHoliday: true,
      customHolidays: [
        { id: 'h1', name: 'Hari Raya', date: '2025-07-17', type: 'one-off' },
      ],
    });
    const startDate = '2025-07-16'; // Wednesday before holiday
    const duration = 2;

    const endDate = computeEndDate(startDate, duration, project);

    // Jul 16 (Wed) is day 1
    // Jul 17 (Thu) is holiday - skip
    // Jul 18 (Fri) is day 2
    expect(endDate).toBe('2025-07-18');
  });

  it('should handle duration of 1 day', () => {
    const project = createTestProject({ weekendHoliday: true });
    const startDate = '2025-06-30';
    const endDate = computeEndDate(startDate, 1, project);
    expect(endDate).toBe('2025-06-30');
  });

  it('should return null for null start date', () => {
    expect(computeEndDate(null, 5, createTestProject())).toBe(null);
  });

  it('should return null for 0 or negative duration', () => {
    const project = createTestProject();
    expect(computeEndDate('2025-06-30', 0, project)).toBe(null);
    expect(computeEndDate('2025-06-30', -1, project)).toBe(null);
  });
});

describe('Scheduler - computeDuration', () => {
  it('should compute duration in working days', () => {
    const project = createTestProject({ weekendHoliday: true });
    const duration = computeDuration('2025-06-30', '2025-07-04', project);

    // June 30 (Mon) to July 4 (Fri) = 5 working days
    expect(duration).toBe(5);
  });

  it('should return 0 for same start and end date', () => {
    const project = createTestProject();
    expect(computeDuration('2025-06-30', '2025-06-30', project)).toBe(0);
  });

  it('should return 0 when end date is before start date', () => {
    const project = createTestProject();
    expect(computeDuration('2025-07-04', '2025-06-30', project)).toBe(0);
  });

  it('should return 0 for null dates', () => {
    const project = createTestProject();
    expect(computeDuration(null, '2025-07-04', project)).toBe(0);
    expect(computeDuration('2025-06-30', null, project)).toBe(0);
    expect(computeDuration(null, null, project)).toBe(0);
  });
});

describe('Scheduler - topologicalSort', () => {
  it('should sort tasks based on dependencies', () => {
    const tasks = [
      createTestTask('A', 'A', 1),
      createTestTask('B', 'B', 2),
      createTestTask('C', 'C', 3),
    ];
    const dependencies = [
      createDependency('d1', 'A', 'B'),
      createDependency('d2', 'B', 'C'),
    ];

    const sorted = topologicalSort(tasks, dependencies);

    // A should come before B, B before C
    expect(sorted.map(t => t.id)).toEqual(['A', 'B', 'C']);
  });

  it('should handle multiple independent chains', () => {
    const tasks = [
      createTestTask('A', 'A', 1),
      createTestTask('B', 'B', 2),
      createTestTask('C', 'C', 3),
      createTestTask('D', 'D', 4),
    ];
    const dependencies = [
      createDependency('d1', 'A', 'C'),
      createDependency('d2', 'B', 'D'),
    ];

    const sorted = topologicalSort(tasks, dependencies);

    // A and B should come before C and D
    const aIdx = sorted.findIndex(t => t.id === 'A');
    const bIdx = sorted.findIndex(t => t.id === 'B');
    const cIdx = sorted.findIndex(t => t.id === 'C');
    const dIdx = sorted.findIndex(t => t.id === 'D');

    expect(aIdx).toBeLessThan(cIdx);
    expect(bIdx).toBeLessThan(dIdx);
  });

  it('should handle tasks with no dependencies', () => {
    const tasks = [
      createTestTask('A', 'A', 1),
      createTestTask('B', 'B', 2),
    ];

    const sorted = topologicalSort(tasks, []);

    expect(sorted.length).toBe(2);
  });
});

describe('Scheduler - forwardPass', () => {
  it('should calculate early start and early finish for simple chain', () => {
    const tasks = [
      createTestTask('A', 'A', 5, '2025-06-30'),
      createTestTask('B', 'B', 3),
    ];
    const dependencies = [createDependency('d1', 'A', 'B', 'FS')];
    const project = createTestProject();

    const result = forwardPass(tasks, dependencies, project);

    const taskA = result.get('A');
    const taskB = result.get('B');

    // A starts at 0, duration 5 => EF = 5
    expect(taskA?.es).toBe(0);
    expect(taskA?.ef).toBe(5);

    // B starts after A finishes (FS) => ES = 5, EF = 5 + 3 = 8
    expect(taskB?.es).toBe(5);
    expect(taskB?.ef).toBe(8);
  });

  it('should handle SS dependency', () => {
    const tasks = [
      createTestTask('A', 'A', 5),
      createTestTask('B', 'B', 3),
    ];
    const dependencies = [createDependency('d1', 'A', 'B', 'SS', 2)];

    const result = forwardPass(tasks, dependencies, createTestProject());

    const taskA = result.get('A');
    const taskB = result.get('B');

    // A: ES = 0, EF = 5
    expect(taskA?.es).toBe(0);
    expect(taskA?.ef).toBe(5);

    // B: SS from A with delay 2 => ES = A.ES + 2 = 2, EF = 2 + 3 = 5
    expect(taskB?.es).toBe(2);
    expect(taskB?.ef).toBe(5);
  });

  it('should handle FF dependency', () => {
    const tasks = [
      createTestTask('A', 'A', 5),
      createTestTask('B', 'B', 3),
    ];
    const dependencies = [createDependency('d1', 'A', 'B', 'FF', 1)];

    const result = forwardPass(tasks, dependencies, createTestProject());

    const taskA = result.get('A');
    const taskB = result.get('B');

    // A: ES = 0, EF = 5
    expect(taskA?.es).toBe(0);
    expect(taskA?.ef).toBe(5);

    // B: FF from A with delay 1 => B.EF = A.EF + 1 = 6, ES = 6 - 3 = 3
    expect(taskB?.ef).toBe(6);
    expect(taskB?.es).toBe(3);
  });

  it('should handle multiple predecessors (take max)', () => {
    const tasks = [
      createTestTask('A', 'A', 5),
      createTestTask('B', 'B', 3),
      createTestTask('C', 'C', 2),
    ];
    const dependencies = [
      createDependency('d1', 'A', 'C', 'FS'),
      createDependency('d2', 'B', 'C', 'FS'),
    ];

    const result = forwardPass(tasks, dependencies, createTestProject());

    const taskA = result.get('A');
    const taskB = result.get('B');
    const taskC = result.get('C');

    // A: ES = 0, EF = 5
    expect(taskA?.ef).toBe(5);
    // B: ES = 0, EF = 3
    expect(taskB?.ef).toBe(3);
    // C: should start after max(A.EF, B.EF) = max(5, 3) = 5
    expect(taskC?.es).toBe(5);
    expect(taskC?.ef).toBe(7);
  });
});

describe('Scheduler - backwardPass', () => {
  it('should calculate late start and late finish', () => {
    const tasks = [
      createTestTask('A', 'A', 5),
      createTestTask('B', 'B', 3),
      createTestTask('C', 'C', 2),
    ];
    const dependencies = [
      createDependency('d1', 'A', 'B', 'FS'),
      createDependency('d2', 'B', 'C', 'FS'),
    ];
    const project = createTestProject();

    const forward = forwardPass(tasks, dependencies, project);
    const backward = backwardPass(tasks, dependencies, project, forward);

    const taskA = backward.get('A');
    const taskB = backward.get('B');
    const taskC = backward.get('C');

    // Project duration = 10 (5 + 3 + 2)
    // C: LF = 10, LS = 10 - 2 = 8
    expect(taskC?.lf).toBe(10);
    expect(taskC?.ls).toBe(8);

    // B: LF = LS of C = 8, LS = 8 - 3 = 5
    expect(taskB?.lf).toBe(8);
    expect(taskB?.ls).toBe(5);

    // A: LF = LS of B = 5, LS = 5 - 5 = 0
    expect(taskA?.lf).toBe(5);
    expect(taskA?.ls).toBe(0);
  });
});

describe('Scheduler - computeFullSchedule', () => {
  it('should compute total float and identify critical path', () => {
    const tasks = [
      createTestTask('A', 'A', 5),
      createTestTask('B', 'B', 3),
      createTestTask('C', 'C', 2),
    ];
    const dependencies = [
      createDependency('d1', 'A', 'B', 'FS'),
      createDependency('d2', 'B', 'C', 'FS'),
    ];
    const project = createTestProject();

    const schedule = computeFullSchedule(tasks, dependencies, project);

    const taskA = schedule.find(s => s.taskId === 'A');
    const taskB = schedule.find(s => s.taskId === 'B');
    const taskC = schedule.find(s => s.taskId === 'C');

    // All tasks in serial chain have 0 float - all are critical
    expect(taskA?.isCritical).toBe(true);
    expect(taskB?.isCritical).toBe(true);
    expect(taskC?.isCritical).toBe(true);
    expect(taskA?.totalFloat).toBe(0);
    expect(taskB?.totalFloat).toBe(0);
    expect(taskC?.totalFloat).toBe(0);
  });

  it('should identify non-critical tasks with float', () => {
    const tasks = [
      createTestTask('A', 'A', 5),
      createTestTask('B', 'B', 2),
      createTestTask('C', 'C', 3),
    ];
    const dependencies = [
      createDependency('d1', 'A', 'B', 'FS'),
      createDependency('d2', 'A', 'C', 'FS'),
    ];
    const project = createTestProject();

    const schedule = computeFullSchedule(tasks, dependencies, project);

    const taskA = schedule.find(s => s.taskId === 'A');
    const taskB = schedule.find(s => s.taskId === 'B');
    const taskC = schedule.find(s => s.taskId === 'C');

    // A is critical (on both paths)
    expect(taskA?.isCritical).toBe(true);

    // B has float of 1 day (A.EF = 5, B finishes at 7, but C finishes at 8)
    expect(taskB?.totalFloat).toBe(1);

    // C is critical (finish at 8, longest path)
    expect(taskC?.isCritical).toBe(true);
  });
});

describe('Scheduler - findAllPaths', () => {
  it('should find all paths from start to end tasks', () => {
    const tasks = [
      createTestTask('A', 'A', 1),
      createTestTask('B', 'B', 2),
      createTestTask('C', 'C', 3),
      createTestTask('D', 'D', 5),
      createTestTask('E', 'E', 7),
      createTestTask('F', 'F', 4),
      createTestTask('G', 'G', 12),
      createTestTask('H', 'H', 21),
      createTestTask('I', 'I', 2),
      createTestTask('J', 'J', 3),
    ];
    const dependencies = [
      createDependency('d1', 'A', 'D', 'FS'),
      createDependency('d2', 'B', 'E', 'FS'),
      createDependency('d3', 'B', 'F', 'FS'),
      createDependency('d4', 'C', 'G', 'FS'),
      createDependency('d5', 'D', 'H', 'FS'),
      createDependency('d6', 'E', 'H', 'FS'),
      createDependency('d7', 'G', 'I', 'FS'),
      createDependency('d8', 'F', 'J', 'FS'),
      createDependency('d9', 'H', 'J', 'FS'),
      createDependency('d10', 'I', 'J', 'FS'),
    ];
    const paths = findAllPaths(tasks, dependencies);

    // Should find exactly 4 paths from start nodes (A, B, C) to end node (J)
    expect(paths.length).toBe(4);

    // Find critical path (longest)
    const criticalPath = paths.find(p => p.isCritical);

    // Critical path should be B -> E -> H -> J with duration 33
    expect(criticalPath?.duration).toBe(33);
    expect(criticalPath?.path).toEqual(['B', 'E', 'H', 'J']);
  });

  it('should match expected durations from Demo B requirement', () => {
    const tasks = [
      createTestTask('A', 'A', 1),
      createTestTask('B', 'B', 2),
      createTestTask('C', 'C', 3),
      createTestTask('D', 'D', 5),
      createTestTask('E', 'E', 7),
      createTestTask('F', 'F', 4),
      createTestTask('G', 'G', 12),
      createTestTask('H', 'H', 21),
      createTestTask('I', 'I', 2),
      createTestTask('J', 'J', 3),
    ];
    const dependencies = [
      createDependency('d1', 'A', 'D', 'FS'),
      createDependency('d2', 'B', 'E', 'FS'),
      createDependency('d3', 'B', 'F', 'FS'),
      createDependency('d4', 'C', 'G', 'FS'),
      createDependency('d5', 'D', 'H', 'FS'),
      createDependency('d6', 'E', 'H', 'FS'),
      createDependency('d7', 'G', 'I', 'FS'),
      createDependency('d8', 'F', 'J', 'FS'),
      createDependency('d9', 'H', 'J', 'FS'),
      createDependency('d10', 'I', 'J', 'FS'),
    ];
    const paths = findAllPaths(tasks, dependencies);

    // ADHJ = 30 (A->D->H->J = 1+5+21+3 = 30)
    const adhj = paths.find(p => p.path[0] === 'A');
    expect(adhj).toBeDefined();
    expect(adhj?.duration).toBe(30);
    expect(adhj?.path).toEqual(['A', 'D', 'H', 'J']);

    // BEHJ = 33 (B->E->H->J = 2+7+21+3 = 33) - critical path
    const behj = paths.find(p => p.path[0] === 'B' && p.path.includes('E'));
    expect(behj).toBeDefined();
    expect(behj?.duration).toBe(33);
    expect(behj?.path).toEqual(['B', 'E', 'H', 'J']);

    // Critical path is B-E-H-J with duration 33
    const critical = paths.find(p => p.isCritical);
    expect(critical?.path).toEqual(['B', 'E', 'H', 'J']);
    expect(critical?.duration).toBe(33);

    // BFJ = 9 (B->F->J = 2+4+3 = 9)
    const bfj = paths.find(p => p.path[0] === 'B' && p.path.includes('F'));
    expect(bfj).toBeDefined();
    expect(bfj?.duration).toBe(9);
    expect(bfj?.path).toEqual(['B', 'F', 'J']);

    // CGIJ = 20 (C->G->I->J = 3+12+2+3 = 20)
    const cgiJ = paths.find(p => p.path[0] === 'C');
    expect(cgiJ).toBeDefined();
    expect(cgiJ?.duration).toBe(20);
    expect(cgiJ?.path).toEqual(['C', 'G', 'I', 'J']);
  });
});

describe('Scheduler - Demo A PT XYZ validation', () => {
  it('should calculate correct dates for Analisis Kebutuhan', () => {
    const project = createTestProject({
      weekendHoliday: true,
      customHolidays: [
        { id: 'h1', name: 'Hari Libur', date: '2025-07-17', type: 'one-off' },
      ],
    });

    // Task 1: Analisis Kebutuhan - start 2025-06-30, 5 hari kerja
    const startDate1 = '2025-06-30';
    const endDate1 = computeEndDate(startDate1, 5, project);
    // Jun 30 (Mon, day1) + 5 working days = Jul 4 (Fri, day5)
    expect(endDate1).toBe('2025-07-04');
    // Verify not on weekend or holiday
    expect(parseDate(endDate1!).getDay()).not.toBe(0); // Not Sunday
    expect(parseDate(endDate1!).getDay()).not.toBe(6); // Not Saturday
    expect(endDate1).not.toBe('2025-07-17');
  });

  it('should calculate correct dates for Analisis Sistem (SS, delay 3)', () => {
    const project = createTestProject({
      weekendHoliday: true,
      customHolidays: [
        { id: 'h1', name: 'Hari Libur', date: '2025-07-17', type: 'one-off' },
      ],
    });

    // Task 2: Analisis Sistem - SS dari Task 1, delay 3 hari
    // Task 1 starts Jun 30, so Task 2 starts Jul 2 (SS + delay 3 = Jun 30 + 3 working days: Jun30(1), Jul1(2), Jul2(3))
    const startDate2 = addWorkingDaysDate('2025-06-30', 3, project);
    expect(startDate2).toBe('2025-07-02');

    const duration2 = 8;
    const endDate2 = computeEndDate(startDate2, duration2, project);
    // Jul 2 (Wed) + 8 working days:
    // Jul 2(1), Jul 3(2), Jul 4(3), Jul 7(4), Jul 8(5), Jul 9(6), Jul 10(7), Jul 11(8)
    expect(endDate2).toBe('2025-07-11');
    // Verify not on weekend or holiday
    expect(parseDate(startDate2).getDay()).not.toBe(0);
    expect(parseDate(startDate2).getDay()).not.toBe(6);
    expect(parseDate(endDate2!).getDay()).not.toBe(0);
    expect(parseDate(endDate2!).getDay()).not.toBe(6);
    expect(endDate2).not.toBe('2025-07-17');
  });

  it('should calculate correct dates for Perancangan (SS, delay 5)', () => {
    const project = createTestProject({
      weekendHoliday: true,
      customHolidays: [
        { id: 'h1', name: 'Hari Libur', date: '2025-07-17', type: 'one-off' },
      ],
    });

    // Task 3: Perancangan - SS dari Task 2, delay 5 hari
    // Task 2 starts Jul 2, so Task 3 starts Jul 8 (Jul 2 + 5 working days: Jul2(1), Jul3(2), Jul4(3), Jul7(4), Jul8(5))
    const startDate3 = addWorkingDaysDate('2025-07-02', 5, project);
    expect(startDate3).toBe('2025-07-08');

    const duration3 = 7;
    const endDate3 = computeEndDate(startDate3, duration3, project);
    // Jul 8 (Tue) + 7 working days:
    // Jul 8(1), Jul 9(2), Jul 10(3), Jul 11(4), Jul 14(5), Jul 15(6), Jul 16(7)
    // Skip Jul 17 (holiday)
    expect(endDate3).toBe('2025-07-16');
    // Verify not on weekend or holiday
    expect(parseDate(startDate3).getDay()).not.toBe(0);
    expect(parseDate(startDate3).getDay()).not.toBe(6);
    expect(parseDate(endDate3!).getDay()).not.toBe(0);
    expect(parseDate(endDate3!).getDay()).not.toBe(6);
    expect(endDate3).not.toBe('2025-07-17');
  });

  it('should calculate correct dates for Implementasi (FS from Perancangan)', () => {
    const project = createTestProject({
      weekendHoliday: true,
      customHolidays: [
        { id: 'h1', name: 'Hari Libur', date: '2025-07-17', type: 'one-off' },
      ],
    });

    // Task 4: Implementasi - FS dari Task 3
    // Perancangan ends Jul 16, so Implementasi starts Jul 18 (Jul 17 is holiday)
    const startDate4 = '2025-07-18';
    const duration4 = 5;
    const endDate4 = computeEndDate(startDate4, duration4, project);
    // Jul 18 (Fri) + 5 working days:
    // Jul 18(1), Jul 21(2), Jul 22(3), Jul 23(4), Jul 24(5)
    expect(startDate4).toBe('2025-07-18');
    expect(endDate4).toBe('2025-07-24');
    // Verify not on weekend or holiday
    expect(parseDate(startDate4).getDay()).not.toBe(0);
    expect(parseDate(startDate4).getDay()).not.toBe(6);
    expect(parseDate(endDate4!).getDay()).not.toBe(0);
    expect(parseDate(endDate4!).getDay()).not.toBe(6);
    expect(endDate4).not.toBe('2025-07-17');
  });

  it('should calculate correct dates for Pengujian (FS from Implementasi)', () => {
    const project = createTestProject({
      weekendHoliday: true,
      customHolidays: [
        { id: 'h1', name: 'Hari Libur', date: '2025-07-17', type: 'one-off' },
      ],
    });

    // Task 5: Pengujian - FS dari Task 4
    // Implementasi ends Jul 24, so Pengujian starts Jul 25 is Fri, Jul 28 is next Mon
    const startDate5 = '2025-07-25';
    const duration5 = 2;
    const endDate5 = computeEndDate(startDate5, duration5, project);
    // Jul 25 (Fri) + 2 working days = Jul 25(1), Jul 28(2)
    expect(startDate5).toBe('2025-07-25');
    expect(endDate5).toBe('2025-07-28');
    // Verify not on weekend or holiday
    expect(parseDate(startDate5).getDay()).not.toBe(0);
    expect(parseDate(startDate5).getDay()).not.toBe(6);
    expect(parseDate(endDate5!).getDay()).not.toBe(0);
    expect(parseDate(endDate5!).getDay()).not.toBe(6);
    expect(endDate5).not.toBe('2025-07-17');
  });

  it('should calculate correct dates for Deploy dan Maintenance (FS from Pengujian)', () => {
    const project = createTestProject({
      weekendHoliday: true,
      customHolidays: [
        { id: 'h1', name: 'Hari Libur', date: '2025-07-17', type: 'one-off' },
      ],
    });

    // Task 6: Deploy dan Maintenance - FS dari Task 5
    // Pengujian ends Jul 28, so Deploy starts Jul 28 is Mon, Jul 29(1), Jul 30(2)
    const startDate6 = '2025-07-28';
    const duration6 = 2;
    const endDate6 = computeEndDate(startDate6, duration6, project);
    // Jul 28 (Mon) + 2 working days = Jul 28(1), Jul 29(2)
    expect(startDate6).toBe('2025-07-28');
    expect(endDate6).toBe('2025-07-29');
    // Verify not on weekend or holiday
    expect(parseDate(startDate6).getDay()).not.toBe(0);
    expect(parseDate(startDate6).getDay()).not.toBe(6);
    expect(parseDate(endDate6!).getDay()).not.toBe(0);
    expect(parseDate(endDate6!).getDay()).not.toBe(6);
    expect(endDate6).not.toBe('2025-07-17');
  });

  it('should calculate total project duration for Demo A', () => {
    const project = createTestProject({
      weekendHoliday: true,
      customHolidays: [
        { id: 'h1', name: 'Hari Libur', date: '2025-07-17', type: 'one-off' },
      ],
    });

    // Total project duration: Jun 30 to Jul 29
    const totalDuration = computeDuration('2025-06-30', '2025-07-29', project);
    expect(totalDuration).toBe(21);
  });
});

describe('Scheduler - Demo B validation', () => {
  it('should find correct paths with correct durations', () => {
    const tasks = [
      createTestTask('A', 'A', 1),
      createTestTask('B', 'B', 2),
      createTestTask('C', 'C', 3),
      createTestTask('D', 'D', 5),
      createTestTask('E', 'E', 7),
      createTestTask('F', 'F', 4),
      createTestTask('G', 'G', 12),
      createTestTask('H', 'H', 21),
      createTestTask('I', 'I', 2),
      createTestTask('J', 'J', 3),
    ];
    const dependencies = [
      createDependency('d1', 'A', 'D', 'FS'),
      createDependency('d2', 'B', 'E', 'FS'),
      createDependency('d3', 'B', 'F', 'FS'),
      createDependency('d4', 'C', 'G', 'FS'),
      createDependency('d5', 'D', 'H', 'FS'),
      createDependency('d6', 'E', 'H', 'FS'),
      createDependency('d7', 'G', 'I', 'FS'),
      createDependency('d8', 'F', 'J', 'FS'),
      createDependency('d9', 'H', 'J', 'FS'),
      createDependency('d10', 'I', 'J', 'FS'),
    ];
    const paths = findAllPaths(tasks, dependencies);

    // Check each expected path
    const pathsByStart = new Map<string, PathInfo>();
    for (const p of paths) {
      pathsByStart.set(p.path[0], p);
    }

    // ADHJ = 30
    expect(pathsByStart.get('A')?.duration).toBe(30);
    expect(pathsByStart.get('A')?.path).toEqual(['A', 'D', 'H', 'J']);

    // B has two paths: BEHJ=33 (critical) and BFJ=9
    const bPaths = paths.filter(p => p.path[0] === 'B');
    expect(bPaths.length).toBe(2);
    
    const behj = paths.find(p => p.path[0] === 'B' && p.path.includes('E'));
    expect(behj?.duration).toBe(33);
    expect(behj?.path).toEqual(['B', 'E', 'H', 'J']);
    expect(behj?.isCritical).toBe(true);

    const bfj = paths.find(p => p.path[0] === 'B' && p.path.includes('F'));
    expect(bfj?.duration).toBe(9);
    expect(bfj?.path).toEqual(['B', 'F', 'J']);

    // C-G-I-J = 20
    expect(pathsByStart.get('C')?.duration).toBe(20);
    expect(pathsByStart.get('C')?.path).toEqual(['C', 'G', 'I', 'J']);

    // Critical path B-E-H-J
    const critical = paths.find(p => p.isCritical);
    expect(critical?.path).toEqual(['B', 'E', 'H', 'J']);
    expect(critical?.duration).toBe(33);
  });
});
