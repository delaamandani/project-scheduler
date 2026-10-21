import { AppData, Project } from '../types';
import { generateId, resetCounter } from './idGenerator';

const STORAGE_KEY = 'project-scheduler-data';

const emptyAppData: AppData = {
  project: null,
  tasks: [],
  resources: [],
  dependencies: [],
};

export function loadAppData(): AppData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return emptyAppData;
    const parsed = JSON.parse(stored) as AppData;
    return parsed;
  } catch {
    return emptyAppData;
  }
}

export function saveAppData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Gagal menyimpan data:', e);
  }
}

export function exportToJSON(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function downloadJSON(data: AppData): void {
  const json = exportToJSON(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.project?.name || 'project'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importFromJSON(jsonStr: string): AppData | null {
  try {
    const data = JSON.parse(jsonStr) as AppData;
    // Basic validation
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

export function handleFileImport(file: File): Promise<AppData | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      resolve(importFromJSON(content));
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}

export function resetData(): void {
  saveAppData(emptyAppData);
  resetCounter();
}

export function getProjectId(): string {
  return generateId('proj');
}

export function getTaskId(): string {
  return generateId('task');
}

export function getResourceId(): string {
  return generateId('res');
}

export function getDependencyId(): string {
  return generateId('dep');
}

export function getHolidayId(): string {
  return generateId('hol');
}

export function createDefaultProject(): Project {
  return {
    id: getProjectId(),
    name: 'Proyek Baru',
    organization: '',
    website: '',
    description: '',
    weekendHoliday: true,
    customHolidays: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
