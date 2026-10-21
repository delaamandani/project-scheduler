import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppData, Task, Resource, Dependency, Project } from '../types';
import {
  loadAppData,
  saveAppData,
  resetData as resetStorage,
} from '../utils/dataManager';
import { generateId } from '../utils/idGenerator';
import { computeEndDate, recalculateSchedule } from '../utils/scheduler';

function useAppData() {
  const [data, setData] = useState<AppData>(loadAppData());
  const [dirty, setDirty] = useState(false);

  // SINGLE SOURCE OF TRUTH untuk tanggal tampilan.
  // Penjadwalan dihitung ulang (otomatis) setiap data mentah berubah,
  // termasuk setelah loadDemo / resetAll / ubah pengaturan libur.
  const scheduledTasks = useMemo(() => {
    if (!data.project) return data.tasks;
    try {
      return recalculateSchedule(data.tasks, data.dependencies, data.project);
    } catch (e) {
      console.error('Perhitungan jadwal gagal:', e);
      return data.tasks;
    }
  }, [data.tasks, data.dependencies, data.project]);

  useEffect(() => {
    if (dirty) {
      saveAppData(data);
      setDirty(false);
    }
  }, [data, dirty]);

  const persist = useCallback(() => setDirty(true), []);

  const setProject = useCallback((project: Project) => {
    setData(prev => ({ ...prev, project }));
    persist();
  }, [persist]);

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTask: Task = {
      ...task,
      id: generateId('task'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setData(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
    persist();
    return newTask;
  }, [persist]);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setData(prev => {
      const tasks = prev.tasks.map(t => {
        if (t.id !== taskId) return t;
        const updated = { ...t, ...updates, updatedAt: new Date().toISOString() };
        // Auto-compute end date if start or duration changed
        if (updates.startDate || updates.durationDays !== undefined) {
          updated.endDate = computeEndDate(updated.startDate, updated.durationDays, prev.project!);
        }
        return updated;
      });
      return { ...prev, tasks };
    });
    persist();
  }, [persist]);

  const deleteTask = useCallback((taskId: string) => {
    setData(prev => {
      const tasks = prev.tasks.filter(t => t.id !== taskId);
      const deps = prev.dependencies.filter(d => d.predecessorId !== taskId && d.successorId !== taskId);
      return { ...prev, tasks, dependencies: deps };
    });
    persist();
  }, [persist]);

  const addDependency = useCallback((dep: Omit<Dependency, 'id'>) => {
    const newDep: Dependency = {
      ...dep,
      id: generateId('dep'),
    };
    setData(prev => ({ ...prev, dependencies: [...prev.dependencies, newDep] }));
    persist();
    return newDep;
  }, [persist]);

  const deleteDependency = useCallback((depId: string) => {
    setData(prev => ({ ...prev, dependencies: prev.dependencies.filter(d => d.id !== depId) }));
    persist();
  }, [persist]);

  const addResource = useCallback((resource: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newResource: Resource = {
      ...resource,
      id: generateId('res'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setData(prev => ({ ...prev, resources: [...prev.resources, newResource] }));
    persist();
    return newResource;
  }, [persist]);

  const updateResource = useCallback((resourceId: string, updates: Partial<Resource>) => {
    setData(prev => ({
      ...prev,
      resources: prev.resources.map(r => {
        if (r.id !== resourceId) return r;
        return { ...r, ...updates, updatedAt: new Date().toISOString() };
      }),
    }));
    persist();
  }, [persist]);

  const deleteResource = useCallback((resourceId: string) => {
    setData(prev => {
      const resources = prev.resources.filter(r => r.id !== resourceId);
      const tasks = prev.tasks.map(t => ({
        ...t,
        resources: t.resources.filter(rid => rid !== resourceId),
      }));
      return { ...prev, resources, tasks };
    });
    persist();
  }, [persist]);

  const allocateResourceToTask = useCallback((taskId: string, resourceId: string) => {
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => {
        if (t.id !== taskId) return t;
        if (t.resources.includes(resourceId)) return t;
        return { ...t, resources: [...t.resources, resourceId], updatedAt: new Date().toISOString() };
      }),
    }));
    persist();
  }, [persist]);

  const removeResourceFromTask = useCallback((taskId: string, resourceId: string) => {
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => {
        if (t.id !== taskId) return t;
        return { ...t, resources: t.resources.filter(rid => rid !== resourceId), updatedAt: new Date().toISOString() };
      }),
    }));
    persist();
  }, [persist]);

  // Menyimpan hasil penjadwalan ke data mentah (opsional; tampilan sudah
  // memakai scheduledTasks sebagai sumber kebenaran otomatis).
  const recalculateAll = useCallback(() => {
    if (!data.project) return;
    const recalculated = recalculateSchedule(data.tasks, data.dependencies, data.project);
    setData(prev => ({ ...prev, tasks: recalculated }));
    persist();
  }, [data.tasks, data.dependencies, data.project, persist]);

  const updateProjectSettings = useCallback((updates: Partial<Project>) => {
    if (!data.project) return;
    const updated = { ...data.project, ...updates, updatedAt: new Date().toISOString() };
    setData(prev => ({ ...prev, project: updated }));
    persist();
    // Recalculate after holiday/weekend changes
    recalculateAll();
  }, [data.project, recalculateAll, persist]);

  const addHoliday = useCallback((holiday: Omit<Project['customHolidays'][0], 'id'>) => {
    if (!data.project) return;
    const newHoliday = { ...holiday, id: generateId('hol') };
    const updated = {
      ...data.project,
      customHolidays: [...data.project.customHolidays, newHoliday],
      updatedAt: new Date().toISOString(),
    };
    setData(prev => ({ ...prev, project: updated }));
    persist();
    recalculateAll();
  }, [data.project, recalculateAll, persist]);

  const removeHoliday = useCallback((holidayId: string) => {
    if (!data.project) return;
    const updated = {
      ...data.project,
      customHolidays: data.project.customHolidays.filter(h => h.id !== holidayId),
      updatedAt: new Date().toISOString(),
    };
    setData(prev => ({ ...prev, project: updated }));
    persist();
    recalculateAll();
  }, [data.project, recalculateAll, persist]);

  const resetAll = useCallback(() => {
    resetStorage();
    setData(loadAppData());
    persist();
  }, [persist]);

  const loadDemo = useCallback((demoData: AppData) => {
    setData(demoData);
    persist();
  }, [persist]);

  return {
    data,
    scheduledTasks,
    setProject,
    addTask,
    updateTask,
    deleteTask,
    addDependency,
    deleteDependency,
    addResource,
    updateResource,
    deleteResource,
    allocateResourceToTask,
    removeResourceFromTask,
    recalculateAll,
    updateProjectSettings,
    addHoliday,
    removeHoliday,
    resetAll,
    loadDemo,
    persist,
  };
}

export default useAppData;
