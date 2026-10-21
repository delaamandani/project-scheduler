import { AppData, Task, Dependency, Resource, Project } from '../types';
import { generateId } from '../utils/idGenerator';

export function createDemoA(): AppData {
  const project: Project = {
    id: generateId('proj'),
    name: 'PT XYZ - Proyek Pengembangan Sistem',
    organization: 'PT XYZ',
    website: 'https://www.ptxyz.co.id',
    description: 'Proyek pengembangan sistem informasi manajemen untuk PT XYZ. Periode 30 Juni - 31 Juli 2025.',
    weekendHoliday: true,
    customHolidays: [
      {
        id: generateId('hol'),
        name: 'Hari Libur Nasional',
        date: '2025-07-17',
        type: 'one-off',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const task1: Task = {
    id: generateId('task'),
    name: 'Analisis Kebutuhan',
    startDate: '2025-06-30',
    durationDays: 5,
    endDate: null, // computed
    priority: 'tinggi',
    color: '#ef4444',
    parentId: null,
    resources: [],
    dependencies: [],
    isManualSchedule: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const task2: Task = {
    id: generateId('task'),
    name: 'Analisis Sistem',
    startDate: null,
    durationDays: 8,
    endDate: null,
    priority: 'tinggi',
    color: '#f97316',
    parentId: null,
    resources: [],
    dependencies: [],
    isManualSchedule: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const task3: Task = {
    id: generateId('task'),
    name: 'Perancangan',
    startDate: null,
    durationDays: 7,
    endDate: null,
    priority: 'sedang',
    color: '#eab308',
    parentId: null,
    resources: [],
    dependencies: [],
    isManualSchedule: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const task4: Task = {
    id: generateId('task'),
    name: 'Implementasi',
    startDate: null,
    durationDays: 5,
    endDate: null,
    priority: 'tinggi',
    color: '#22c55e',
    parentId: null,
    resources: [],
    dependencies: [],
    isManualSchedule: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const task5: Task = {
    id: generateId('task'),
    name: 'Pengujian',
    startDate: null,
    durationDays: 2,
    endDate: null,
    priority: 'tinggi',
    color: '#3b82f6',
    parentId: null,
    resources: [],
    dependencies: [],
    isManualSchedule: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const task6: Task = {
    id: generateId('task'),
    name: 'Deploy dan Maintenance',
    startDate: null,
    durationDays: 2,
    endDate: null,
    priority: 'sedang',
    color: '#8b5cf6',
    parentId: null,
    resources: [],
    dependencies: [],
    isManualSchedule: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const dependencies: Dependency[] = [
    {
      id: generateId('dep'),
      predecessorId: task1.id,
      successorId: task2.id,
      type: 'SS',
      delayDays: 3,
    },
    {
      id: generateId('dep'),
      predecessorId: task2.id,
      successorId: task3.id,
      type: 'SS',
      delayDays: 5,
    },
    {
      id: generateId('dep'),
      predecessorId: task3.id,
      successorId: task4.id,
      type: 'FS',
      delayDays: 0,
    },
    {
      id: generateId('dep'),
      predecessorId: task4.id,
      successorId: task5.id,
      type: 'FS',
      delayDays: 0,
    },
    {
      id: generateId('dep'),
      predecessorId: task5.id,
      successorId: task6.id,
      type: 'FS',
      delayDays: 0,
    },
  ];

  const resources: Resource[] = [
    {
      id: generateId('res'),
      name: 'Ahmad Fauzi',
      phone: '081234567890',
      email: 'ahmad@ptxyz.co.id',
      role: 'Project Manager',
      salary: 15000000,
      personalHolidays: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: generateId('res'),
      name: 'Siti Nurhaliza',
      phone: '089876543210',
      email: 'siti@ptxyz.co.id',
      role: 'System Analyst',
      salary: 12000000,
      personalHolidays: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: generateId('res'),
      name: 'Budi Santoso',
      phone: '085555555555',
      email: 'budi@ptxyz.co.id',
      role: 'Developer',
      salary: 10000000,
      personalHolidays: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // Allocate resources to tasks
  task1.resources = [resources[1].id];
  task2.resources = [resources[1].id];
  task3.resources = [resources[2].id];
  task4.resources = [resources[2].id];
  task5.resources = [resources[2].id];
  task6.resources = [resources[0].id];

  return {
    project,
    tasks: [task1, task2, task3, task4, task5, task6],
    resources,
    dependencies,
  };
}

export function createDemoB(): AppData {
  const project: Project = {
    id: generateId('proj'),
    name: 'Contoh PERT - 10 Aktivitas',
    organization: 'Contoh',
    website: '',
    description: 'Contoh proyek dengan 10 aktivitas untuk pengujian critical path.',
    weekendHoliday: false,
    customHolidays: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const tasks: Task[] = [
    { id: 'A', name: 'A', startDate: '2025-01-01', durationDays: 1, endDate: null, priority: 'sedang', color: '#3b82f6', parentId: null, resources: [], dependencies: [], isManualSchedule: true, createdAt: '', updatedAt: '' },
    { id: 'B', name: 'B', startDate: '2025-01-01', durationDays: 2, endDate: null, priority: 'sedang', color: '#ef4444', parentId: null, resources: [], dependencies: [], isManualSchedule: true, createdAt: '', updatedAt: '' },
    { id: 'C', name: 'C', startDate: '2025-01-01', durationDays: 3, endDate: null, priority: 'sedang', color: '#22c55e', parentId: null, resources: [], dependencies: [], isManualSchedule: true, createdAt: '', updatedAt: '' },
    { id: 'D', name: 'D', startDate: null, durationDays: 5, endDate: null, priority: 'sedang', color: '#f97316', parentId: null, resources: [], dependencies: [], isManualSchedule: false, createdAt: '', updatedAt: '' },
    { id: 'E', name: 'E', startDate: null, durationDays: 7, endDate: null, priority: 'sedang', color: '#a855f7', parentId: null, resources: [], dependencies: [], isManualSchedule: false, createdAt: '', updatedAt: '' },
    { id: 'F', name: 'F', startDate: null, durationDays: 4, endDate: null, priority: 'sedang', color: '#ec4899', parentId: null, resources: [], dependencies: [], isManualSchedule: false, createdAt: '', updatedAt: '' },
    { id: 'G', name: 'G', startDate: null, durationDays: 12, endDate: null, priority: 'sedang', color: '#14b8a6', parentId: null, resources: [], dependencies: [], isManualSchedule: false, createdAt: '', updatedAt: '' },
    { id: 'H', name: 'H', startDate: null, durationDays: 21, endDate: null, priority: 'sedang', color: '#8b5cf6', parentId: null, resources: [], dependencies: [], isManualSchedule: false, createdAt: '', updatedAt: '' },
    { id: 'I', name: 'I', startDate: null, durationDays: 2, endDate: null, priority: 'sedang', color: '#eab308', parentId: null, resources: [], dependencies: [], isManualSchedule: false, createdAt: '', updatedAt: '' },
    { id: 'J', name: 'J', startDate: null, durationDays: 3, endDate: null, priority: 'sedang', color: '#06b6d4', parentId: null, resources: [], dependencies: [], isManualSchedule: false, createdAt: '', updatedAt: '' },
  ];

  const dependencies: Dependency[] = [
    { id: 'd1', predecessorId: 'A', successorId: 'D', type: 'FS', delayDays: 0 },
    { id: 'd2', predecessorId: 'B', successorId: 'E', type: 'FS', delayDays: 0 },
    { id: 'd3', predecessorId: 'B', successorId: 'F', type: 'FS', delayDays: 0 },
    { id: 'd4', predecessorId: 'C', successorId: 'G', type: 'FS', delayDays: 0 },
    { id: 'd5', predecessorId: 'D', successorId: 'H', type: 'FS', delayDays: 0 },
    { id: 'd6', predecessorId: 'E', successorId: 'H', type: 'FS', delayDays: 0 },
    { id: 'd7', predecessorId: 'G', successorId: 'I', type: 'FS', delayDays: 0 },
    { id: 'd8', predecessorId: 'F', successorId: 'J', type: 'FS', delayDays: 0 },
    { id: 'd9', predecessorId: 'H', successorId: 'J', type: 'FS', delayDays: 0 },
    { id: 'd10', predecessorId: 'I', successorId: 'J', type: 'FS', delayDays: 0 },
  ];

  const resources: Resource[] = [];

  return {
    project,
    tasks,
    resources,
    dependencies,
  };
}
