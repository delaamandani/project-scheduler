import { useState, useCallback } from 'react';
import { Task, Resource, Project } from './types';
import { generateId } from './utils/idGenerator';
import useAppData from './hooks/useAppData';
import Header from './components/Header';
import Navigation from './components/Navigation';
import ProjectSettings from './components/ProjectSettings';
import TaskForm from './components/TaskForm';
import ResourceForm from './components/ResourceForm';
import GanttChart from './components/GanttChart';
import PERTDiagram from './components/PERTDiagram';
import CriticalPathAnalysis from './components/CriticalPathAnalysis';
import { createDemoA, createDemoB } from './demo/demos';
import { downloadJSON, handleFileImport } from './utils/dataManager';
import './App.css';

type TabId = 'tasks' | 'resources' | 'gantt' | 'pert' | 'critical-path' | 'settings';

const TABS: { id: TabId; label: string }[] = [
  { id: 'tasks', label: 'Tugas' },
  { id: 'resources', label: 'Sumber Daya' },  {id: 'gantt', label: 'Bagan Gantt'},
  {id: 'pert', label: 'Diagram PERT'},
  {id: 'critical-path', label: 'Analisis Jalur Kritis'},
  { id: 'settings', label: 'Pengaturan' },
];

function App() {
  const { data, scheduledTasks, setProject, addTask, updateTask, deleteTask, addResource, updateResource, deleteResource, updateProjectSettings, addHoliday, removeHoliday, resetAll, loadDemo } = useAppData();

  const [activeTab, setActiveTab] = useState<TabId>('tasks');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);


  const handleNewProject = useCallback(() => {
    const newProject: Project = {
      id: generateId('proj'),
      name: 'Proyek Baru',
      organization: '',
      website: '',
      description: '',
      weekendHoliday: true,
      customHolidays: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProject(newProject);
    setActiveTab('settings');
  }, [setProject]);

  const handleReset = useCallback(() => {
    if (confirm('Hapus semua data? Tindakan ini tidak dapat dibatalkan.')) {
      resetAll();
    }
  }, [resetAll]);

  const handleLoadDemoA = useCallback(() => {
    if (confirm('Muat contoh data proyek PT XYZ? Data saat ini akan diganti.')) {
      loadDemo(createDemoA());
    }
  }, [loadDemo]);

  const handleLoadDemoB = useCallback(() => {
    if (confirm('Muat contoh data 10 aktivitas? Data saat ini akan diganti.')) {
      loadDemo(createDemoB());
    }
  }, [loadDemo]);

  const handleExport = useCallback(() => {
    if (!data.project) return;
    downloadJSON(data);
  }, [data]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const imported = await handleFileImport(file);
      if (imported) {
        if (confirm('Impor data ini? Data saat ini akan diganti.')) {
          loadDemo(imported);
        }
      } else {
        alert('File JSON tidak valid.');
      }
    };
    input.click();
  }, [loadDemo]);

  const handleSaveTask = useCallback((task: Task) => {
    if (editingTask && editingTask.id === task.id) {
      updateTask(task.id, task);
    } else {
      addTask(task);
    }
    setShowTaskForm(false);
    setEditingTask(null);
  }, [editingTask, addTask, updateTask]);

  const handleDeleteTask = useCallback((id: string) => {
    deleteTask(id);
  }, [deleteTask]);

  const handleSaveResource = useCallback((resource: Resource) => {
    if (editingResource && editingResource.id === resource.id) {
      updateResource(resource.id, resource);
    } else {
      addResource(resource);
    }
    setShowResourceForm(false);
    setEditingResource(null);
  }, [editingResource, addResource, updateResource]);

  const handleDeleteResource = useCallback((id: string) => {
    deleteResource(id);
  }, [deleteResource]);

  const openNewTaskForm = () => {
    setEditingTask(null);
    setShowTaskForm(true);
  };

  const openEditTaskForm = (task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const openNewResourceForm = () => {
    setEditingResource(null);
    setShowResourceForm(true);
  };

  const openEditResourceForm = (resource: Resource) => {
    setEditingResource(resource);
    setShowResourceForm(true);
  };

  const getResourceById = (id: string) => data.resources.find((r) => r.id === id);

  return (
    <div className="app-container">
      <Header
        onNewProject={handleNewProject}
        onReset={handleReset}
        onLoadDemoA={handleLoadDemoA}
        onLoadDemoB={handleLoadDemoB}
        onExport={handleExport}
        onImport={handleImport}
        projectName={data.project?.name || null}
      />

      <main className="main-content">
        <Navigation activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as TabId)} tabs={TABS} />

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Manajemen Tugas</h2>
              <button className="btn btn-primary" onClick={openNewTaskForm}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Tugas Baru
              </button>
            </div>

            <div className="card">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nama Tugas</th>
                      <th>Mulai</th>
                      <th>Selesai</th>
                      <th>Durasi</th>
                      <th>Prioritas</th>
                      <th>Induk</th>
                      <th>Sumber Daya</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...scheduledTasks]
                      .sort((a, b) => {
                        // Show parent tasks first, then by start date
                        if (a.parentId && !b.parentId) return 1;
                        if (!a.parentId && b.parentId) return -1;
                        if (a.startDate && b.startDate) {
                          return a.startDate.localeCompare(b.startDate);
                        }
                        return 0;
                      })
                      .map((task) => (
                        <tr key={task.id} data-task-row={task.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div
                                style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '3px',
                                  background: task.color,
                                }}
                              />
                              <span>{task.name}</span>
                              {task.parentId && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                                  (sub-tugas)
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{task.startDate || '-'}</td>
                          <td>{task.endDate || '-'}</td>
                          <td>{task.durationDays} hari kerja</td>
                          <td>
                            <span className={`badge badge-${task.priority}`}>
                              {task.priority}
                            </span>
                          </td>
                          <td>
                            {task.parentId
                              ? scheduledTasks.find((t) => t.id === task.parentId)?.name || '-'
                              : '-'}
                          </td>
                          <td>
                            {task.resources.length > 0
                              ? task.resources
                                  .map((rid) => getResourceById(rid))
                                  .filter(Boolean)
                                  .map((r) => r!.name)
                                  .join(', ')
                              : '-'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button
                                className="btn btn-icon btn-sm"
                                onClick={() => openEditTaskForm(task)}
                                title="Edit"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button
                                className="btn btn-icon btn-sm"
                                onClick={() => handleDeleteTask(task.id)}
                                title="Hapus"
                                style={{ color: 'var(--danger)' }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {scheduledTasks.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '2rem' }}>
                          Belum ada tugas. Klik "Tugas Baru" untuk menambahkan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Manajemen Sumber Daya</h2>
              <button className="btn btn-primary" onClick={openNewResourceForm}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Sumber Daya Baru
              </button>
            </div>

            <div className="card">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Telepon</th>
                      <th>Email</th>
                      <th>Peran</th>
                      <th>Gaji</th>
                      <th>Hari Libur Pribadi</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.resources.map((resource) => (
                      <tr key={resource.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'var(--primary-light)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--primary-dark)',
                                fontWeight: '600',
                                fontSize: '0.875rem',
                              }}
                            >
                              {resource.name.charAt(0)}
                            </div>
                            <span>{resource.name}</span>
                          </div>
                        </td>
                        <td>{resource.phone || '-'}</td>
                        <td>{resource.email || '-'}</td>
                        <td>{resource.role || '-'}</td>
                        <td>
                          {resource.salary
                            ? new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR',
                                maximumFractionDigits: 0,
                              }).format(resource.salary)
                            : '-'}
                        </td>
                        <td>
                          {resource.personalHolidays.length > 0
                            ? resource.personalHolidays.map((d) => (
                                <span
                                  key={d}
                                  className="badge"
                                  style={{ background: 'var(--gray-200)', marginRight: '0.25rem' }}
                                >
                                  {d}
                                </span>
                              ))
                            : '-'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button
                              className="btn btn-icon btn-sm"
                              onClick={() => openEditResourceForm(resource)}
                              title="Edit"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              className="btn btn-icon btn-sm"
                              onClick={() => handleDeleteResource(resource.id)}
                              title="Hapus"
                              style={{ color: 'var(--danger)' }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {data.resources.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '2rem' }}>
                          Belum ada sumber daya. Klik "Sumber Daya Baru" untuk menambahkan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Resource allocation overview */}
            {data.resources.length > 0 && (
              <div className="card">
                <div className="card-header">                        <h3 className="card-title">Alokasi Sumber Daya</h3>
                </div>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Sumber Daya</th>
                        <th>Tugas yang Dialokasikan</th>
                        <th>Jumlah Tugas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.resources.map((resource) => {
                        const allocatedTasks = data.tasks.filter((t) =>
                          t.resources.includes(resource.id)
                        );
                        return (
                          <tr key={resource.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: 'var(--primary-light)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--primary-dark)',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                  }}
                                >
                                  {resource.name.charAt(0)}
                                </div>
                                <span>{resource.name}</span>
                              </div>
                            </td>
                            <td>
                              {allocatedTasks.length > 0 ? (
                                allocatedTasks.map((t) => (
                                  <span
                                    key={t.id}
                                    className="badge"
                                    style={{ background: 'var(--gray-200)', marginRight: '0.25rem' }}
                                  >
                                    {t.name}
                                  </span>
                                ))
                              ) : (
                                <span style={{ color: 'var(--gray-500)' }}>Tidak ada</span>
                              )}
                            </td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  background:
                                    allocatedTasks.length > 0 ? 'var(--primary)' : 'var(--gray-200)',
                                  color: allocatedTasks.length > 0 ? 'white' : 'var(--gray-600)',
                                }}
                              >
                                {allocatedTasks.length}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bagan Gantt */}
        {activeTab === 'gantt' && (
          <GanttChart
            tasks={scheduledTasks}
            dependencies={data.dependencies}
            project={data.project}
          />
        )}

        {/* Diagram PERT */}
        {activeTab === 'pert' && (
          <PERTDiagram
            tasks={scheduledTasks}
            dependencies={data.dependencies}
          />
        )}

        {/* Analisis Jalur Kritis */}
        {activeTab === 'critical-path' && (
          <CriticalPathAnalysis
            tasks={scheduledTasks}
            dependencies={data.dependencies}
            project={data.project}
          />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <ProjectSettings
            project={data.project}
            onUpdate={updateProjectSettings}
            onAddHoliday={addHoliday}
            onRemoveHoliday={removeHoliday}
          />
        )}
      </main>

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          task={editingTask}
          allTasks={scheduledTasks}
          allResources={data.resources}
          project={data.project}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onClose={() => {
            setShowTaskForm(false);
            setEditingTask(null);
          }}
          isNew={!editingTask}
        />
      )}

      {/* Resource Form Modal */}
      {showResourceForm && (
        <ResourceForm
          resource={editingResource}
          onSave={handleSaveResource}
          onDelete={handleDeleteResource}
          onClose={() => {
            setShowResourceForm(false);
            setEditingResource(null);
          }}
          isNew={!editingResource}
        />
      )}
    </div>
  );
}

export default App;
