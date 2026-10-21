import { Task, Dependency, Project, ScheduleResult, PathInfo } from '../types';
import { parseDate, formatDate, addWorkingDays, countWorkingDaysBetween, getHolidaySet } from './dateUtils';

export type { PathInfo };

/**
 * Calculate end date from start date and working-day duration.
 * Skips weekends (if configured) and custom holidays.
 * Duration is inclusive of start date (day 1 = start date).
 */
export function computeEndDate(
  startDateStr: string | null,
  durationDays: number,
  project: Project
): string | null {
  if (!startDateStr || durationDays <= 0) return null;
  
  const start = parseDate(startDateStr);
  const holidaySet = getHolidaySet(
    project.customHolidays,
    project.weekendHoliday,
    start.getFullYear()
  );
  
  // addWorkingDays with duration includes start date as day 1
  const endDate = addWorkingDays(start, durationDays, project.weekendHoliday, holidaySet);
  return formatDate(endDate);
}

/**
 * Calculate duration in working days between two dates (inclusive).
 */
export function computeDuration(
  startDateStr: string | null,
  endDateStr: string | null,
  project: Project
): number {
  if (!startDateStr || !endDateStr) return 0;
  
  const start = parseDate(startDateStr);
  const end = parseDate(endDateStr);
  
  if (end < start) return 0;
  
  const holidaySet = getHolidaySet(
    project.customHolidays,
    project.weekendHoliday,
    start.getFullYear()
  );
  
  return countWorkingDaysBetween(start, end, project.weekendHoliday, holidaySet);
}

/**
 * Topological sort of tasks based on dependencies.
 */
export function topologicalSort(tasks: Task[], dependencies: Dependency[]): Task[] {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  
  for (const task of tasks) {
    adj.set(task.id, []);
    inDegree.set(task.id, 0);
  }
  
  for (const dep of dependencies) {
    const pred = adj.get(dep.predecessorId);
    if (pred) {
      pred.push(dep.successorId);
    }
    inDegree.set(dep.successorId, (inDegree.get(dep.successorId) ?? 0) + 1);
  }
  
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  
  const result: Task[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const task = taskMap.get(id);
    if (task) result.push(task);
    
    for (const succId of adj.get(id) ?? []) {
      inDegree.set(succId, inDegree.get(succId)! - 1);
      if (inDegree.get(succId) === 0) {
        queue.push(succId);
      }
    }
  }
  
  return result;
}

/**
 * Compute forward pass: early start (ES) and early finish (EF) for all tasks.
 * Uses working-day offsets from project start (index 0 = day 1).
 */
export function forwardPass(
  tasks: Task[],
  dependencies: Dependency[],
  _project: Project
): Map<string, { es: number; ef: number }> {
  const sorted = topologicalSort(tasks, dependencies);
  const result = new Map<string, { es: number; ef: number }>();
  
  // Initialize all to 0
  for (const task of tasks) {
    result.set(task.id, { es: 0, ef: 0 });
  }
  
  for (const task of sorted) {
    const deps = dependencies.filter(d => d.successorId === task.id);
    
    let maxES = 0;
    for (const dep of deps) {
      const predInfo = result.get(dep.predecessorId);
      if (predInfo) {
        let es = 0;
        // Calculate early start based on dependency type
        if (dep.type === 'FS') {
          // Finish-to-Start: successor starts after predecessor finishes + delay
          es = predInfo.ef + dep.delayDays;
        } else if (dep.type === 'SS') {
          // Start-to-Start: successor starts when predecessor starts + delay
          es = predInfo.es + dep.delayDays;
        } else if (dep.type === 'FF') {
          // Finish-to-Finish: successor finishes when predecessor finishes + delay
          es = predInfo.ef + dep.delayDays - task.durationDays;
        } else if (dep.type === 'SF') {
          // Start-to-Finish: successor finishes when predecessor starts + delay
          es = predInfo.es + dep.delayDays - task.durationDays;
        }
        if (es > maxES) maxES = es;
      }
    }
    
    const es = maxES;
    const ef = es + task.durationDays;
    result.set(task.id, { es, ef });
  }
  
  return result;
}

/**
 * Compute backward pass: late start (LS) and late finish (LF).
 */
export function backwardPass(
  tasks: Task[],
  dependencies: Dependency[],
  _project: Project,
  forwardResults: Map<string, { es: number; ef: number }>
): Map<string, { ls: number; lf: number }> {
  const result = new Map<string, { ls: number; lf: number }>();
  const hasSuccessor = new Set<string>();
  const successorsMap = new Map<string, { dep: Dependency; succId: string }[]>();
  
  for (const task of tasks) {
    result.set(task.id, { ls: 0, lf: 0 });
    successorsMap.set(task.id, []);
  }
  
  // Build successor map
  for (const dep of dependencies) {
    hasSuccessor.add(dep.predecessorId);
    const list = successorsMap.get(dep.predecessorId) ?? [];
    list.push({ dep, succId: dep.successorId });
    successorsMap.set(dep.predecessorId, list);
  }
  
  // Find project end (max EF)
  let maxEF = 0;
  for (const [_, info] of forwardResults) {
    if (info.ef > maxEF) maxEF = info.ef;
  }
  
  // Process in reverse topological order
  const sorted = topologicalSort(tasks, dependencies);
  for (let i = sorted.length - 1; i >= 0; i--) {
    const task = sorted[i];
    const succInfos = successorsMap.get(task.id) ?? [];
    
    // Determine LF for this task
    let lf = maxEF;
    if (succInfos.length > 0) {
      // Task has successors, calculate LF based on their LS
      let minLS = Infinity;
      for (const { dep, succId } of succInfos) {
        const succInfo = result.get(succId);
        if (succInfo) {
          let predLS = 0;
          if (dep.type === 'FS') {
            // Successor starts after predecessor finishes
            // So predecessor LF = successor LS - delay
            predLS = succInfo.ls - dep.delayDays;
          } else if (dep.type === 'SS') {
            // Successor starts with predecessor start
            // So predecessor LS = successor LS - delay
            // predecessor LF = predecessor LS + predecessor duration
            predLS = succInfo.ls - dep.delayDays;
          } else if (dep.type === 'FF') {
            // Successor finishes with predecessor finish + delay
            // So predecessor LF = successor LF - delay
            predLS = succInfo.lf - dep.delayDays - task.durationDays;
          } else if (dep.type === 'SF') {
            // Successor finishes when predecessor starts + delay
            // So predecessor LF = successor LS - delay (because successor LS = successor LF - successor duration)
            predLS = succInfo.ls - dep.delayDays - task.durationDays;
          }
          if (predLS < minLS) minLS = predLS;
        }
      }
      lf = minLS === Infinity ? maxEF : minLS;
    }
    
    const ls = Math.max(0, lf - task.durationDays);
    result.set(task.id, { ls, lf });
  }
  
  return result;
}

/**
 * Compute complete schedule with ES, EF, LS, LF, total float, and critical flag.
 */
export function computeFullSchedule(
  tasks: Task[],
  dependencies: Dependency[],
  project: Project
): ScheduleResult[] {
  const forward = forwardPass(tasks, dependencies, project);
  const backward = backwardPass(tasks, dependencies, project, forward);
  
  return tasks.map(task => {
    const f = forward.get(task.id) ?? { es: 0, ef: 0 };
    const b = backward.get(task.id) ?? { ls: 0, lf: 0 };
    const totalFloat = b.ls - f.es;
    return {
      taskId: task.id,
      startDate: task.startDate,
      endDate: task.endDate,
      earlyStart: f.es > 0 ? String(f.es) : null,
      earlyFinish: f.ef > 0 ? String(f.ef) : null,
      lateStart: b.ls > 0 ? String(b.ls) : null,
      lateFinish: b.lf > 0 ? String(b.lf) : null,
      totalFloat: totalFloat,
      isCritical: totalFloat === 0,
    };
  });
}

/**
 * Find all paths from start tasks (no predecessors) to end tasks (no successors).
 * Returns path info with durations.
 */
export function findAllPaths(
  tasks: Task[],
  dependencies: Dependency[]
): PathInfo[] {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const adj = new Map<string, string[]>();
  const hasPredecessor = new Set<string>();
  const hasSuccessor = new Set<string>();
  
  for (const task of tasks) {
    adj.set(task.id, []);
  }
  
  for (const dep of dependencies) {
    adj.get(dep.predecessorId)?.push(dep.successorId);
    hasPredecessor.add(dep.successorId);
    hasSuccessor.add(dep.predecessorId);
  }
  
  // Start tasks: no predecessors
  const startTasks = tasks.filter(t => !hasPredecessor.has(t.id));
  
  const paths: PathInfo[] = [];
  
  function dfs(currentId: string, path: string[], duration: number) {
    const task = taskMap.get(currentId);
    if (!task) return;
    
    const newPath = [...path, currentId];
    const newDuration = duration + task.durationDays;
    
    const successors = adj.get(currentId);
    if (!successors || successors.length === 0) {
      // Leaf node - task has no successors, so add as complete path
      paths.push({ path: newPath, duration: newDuration, isCritical: false });
      return;
    }
    
    for (const nextId of successors) {
      dfs(nextId, newPath, newDuration);
    }
  }
  
  for (const start of startTasks) {
    dfs(start.id, [], 0);
  }
  
  // If no paths found, add direct paths for each task (for isolated tasks)
  if (paths.length === 0 && tasks.length > 0) {
    for (const task of tasks) {
      paths.push({ path: [task.id], duration: task.durationDays, isCritical: false });
    }
  }
  
  // Mark critical path (longest)
  if (paths.length > 0) {
    const maxDuration = Math.max(...paths.map(p => p.duration));
    for (const p of paths) {
      p.isCritical = p.duration === maxDuration;
    }
  }
  
  return paths;
}

/**
 * Recalculate all task dates based on dependencies and working days.
 * Uses forward pass to calculate ES/EF for all tasks, then converts to actual dates.
 * Tasks without predecessors that don't have a manual start date will start on project start date.
 */
export function recalculateSchedule(
  tasks: Task[],
  dependencies: Dependency[],
  project: Project
): Task[] {
  // Determine project start date: use earliest manual start date, or today
  let projectStartDate: Date;
  const manualStartTasks = tasks.filter(t => t.startDate && t.isManualSchedule);
  if (manualStartTasks.length > 0) {
    projectStartDate = manualStartTasks.reduce((min, t) => {
      const d = parseDate(t.startDate!);
      return !min || d < min ? d : min;
    }, null as Date | null) ?? new Date();
  } else {
    projectStartDate = new Date();
  }

  // Holiday set must use the PROJECT year, not "current" year
  const holidaySet = getHolidaySet(
    project.customHolidays,
    project.weekendHoliday,
    projectStartDate.getFullYear()
  );

  // Forward pass: ES/EF in working-day offsets (0-based; offset 0 = first working day)
  const forward = forwardPass(tasks, dependencies, project);

  const result: Task[] = tasks.map(task => {
    const newTask = { ...task };
    const info = forward.get(task.id);

    if (task.isManualSchedule && task.startDate) {
      // Manual schedule: keep the manually chosen date, only compute the end date
      newTask.startDate = task.startDate;
      newTask.endDate = computeEndDate(task.startDate, task.durationDays, project);
    } else {
      // Auto schedule from ES offset.
      // ES is a 0-based working-day index; addWorkingDays(start, N) returns the N-th
      // working day counting start as day 1, so offset k => N = k + 1.
      const offset = info ? info.es : 0;
      const newStartDate = addWorkingDays(projectStartDate, offset + 1, project.weekendHoliday, holidaySet);
      newTask.startDate = formatDate(newStartDate);
      newTask.endDate = computeEndDate(newTask.startDate, task.durationDays, project);
      newTask.isManualSchedule = false;
    }

    return newTask;
  });

  // Update parent dates from children
  return updateParentFromChildren(result, project);
}

/**
 * Update parent task dates based on children.
 */
export function updateParentFromChildren(
  tasks: Task[],
  project: Project
): Task[] {
  const result = tasks.map(task => {
    if (!task.parentId) return task;
    
    const children = tasks.filter(t => t.parentId === task.id);
    if (children.length === 0) return task;
    
    const childWithDates = children.filter(c => c.startDate && c.endDate);
    if (childWithDates.length === 0) return task;
    
    const minStart = childWithDates.reduce((min, c) => {
      const d = parseDate(c.startDate!);
      return !min || d < min ? d : min;
    }, null as Date | null);
    
    const maxEnd = childWithDates.reduce((max, c) => {
      const d = parseDate(c.endDate!);
      return !max || d > max ? d : max;
    }, null as Date | null);
    
    if (minStart && maxEnd) {
      return {
        ...task,
        startDate: formatDate(minStart),
        endDate: formatDate(maxEnd),
        durationDays: computeDuration(formatDate(minStart), formatDate(maxEnd), project),
        isManualSchedule: false,
      };
    }
    
    return task;
  });
  
  return result;
}
