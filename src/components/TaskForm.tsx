import { FC, useState, useEffect } from 'react';
import { Task, Dependency, Resource } from '../types';
import { parseDate, formatDate, addWorkingDays, getHolidaySet } from '../utils/dateUtils';

interface Props {
  task: Task | null;
  allTasks: Task[];
  allResources: Resource[];
  project: { weekendHoliday: boolean; customHolidays: { date: string; type: 'one-off' | 'recurring'; month?: number; day?: number; until?: string }[] } | null;
  onSave: (task: Task) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  isNew: boolean;
}

const PRIORITIES: { value: Task['priority']; label: string }[] = [
  { value: 'rendah', label: 'Rendah' },
  { value: 'sedang', label: 'Sedang' },
  { value: 'tinggi', label: 'Tinggi' },
];

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#06b6d4',
];

const TaskForm: FC<Props> = ({
  task,
  allTasks,
  allResources,
  project,
  onSave,
  onDelete,
  onClose,
  isNew,
}) => {
  const [form, setForm] = useState<Task>({
    id: task?.id || '',
    name: task?.name || '',
    startDate: task?.startDate || null,
    durationDays: task?.durationDays || 1,
    endDate: task?.endDate || null,
    priority: task?.priority || 'sedang',
    color: task?.color || COLORS[0],
    parentId: task?.parentId || null,
    resources: task?.resources || [],
    dependencies: task?.dependencies || [],
    isManualSchedule: task?.isManualSchedule || false,
    createdAt: task?.createdAt || '',
    updatedAt: task?.updatedAt || '',
  });

  // Auto-compute end date when start or duration changes
  useEffect(() => {
    if (form.startDate && project) {
      const holidaySet = getHolidaySet(
        project.customHolidays,
        project.weekendHoliday,
        parseDate(form.startDate).getFullYear()
      );
      const endDate = addWorkingDays(
        parseDate(form.startDate),
        form.durationDays - 1,
        project.weekendHoliday,
        holidaySet
      );
      setForm((prev) => ({ ...prev, endDate: formatDate(endDate) }));
    }
  }, [form.startDate, form.durationDays, project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  const handleDelete = () => {
    if (task && confirm('Hapus tugas ini?')) {
      onDelete(task.id);
      onClose();
    }
  };

  const toggleResource = (resourceId: string) => {
    setForm((prev) => ({
      ...prev,
      resources: prev.resources.includes(resourceId)
        ? prev.resources.filter((r) => r !== resourceId)
        : [...prev.resources, resourceId],
    }));
  };

  const parentTasks = allTasks.filter((t) => t.id !== task?.id);


  const depTypes: { value: Dependency['type']; label: string }[] = [
    { value: 'FS', label: 'FS (Finish-to-Start)' },
    { value: 'SS', label: 'SS (Start-to-Start)' },
    { value: 'FF', label: 'FF (Finish-to-Finish)' },
    { value: 'SF', label: 'SF (Start-to-Finish)' },
  ];

  const [depForm, setDepForm] = useState<{ predecessorId: string; type: Dependency['type']; delayDays: number }>({
    predecessorId: '',
    type: 'FS',
    delayDays: 0,
  });

  const addDependency = () => {
    if (!depForm.predecessorId) return;
    const newDep: Dependency = {
      id: `dep-${Date.now()}`,
      predecessorId: depForm.predecessorId,
      successorId: task?.id || '',
      type: depForm.type,
      delayDays: depForm.delayDays,
    };
    setForm((prev) => ({
      ...prev,
      dependencies: [...prev.dependencies, newDep],
    }));
    setDepForm({ predecessorId: '', type: 'FS', delayDays: 0 });
  };

  const removeDependency = (depId: string) => {
    setForm((prev) => ({
      ...prev,
      dependencies: prev.dependencies.filter((d) => d.id !== depId),
    }));
  };

  const hasChildren = allTasks.some((t) => t.parentId === task?.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">            <h3 className="modal-title">
            {isNew ? 'Tugas Baru' : (task?.name || 'Edit Tugas')}
          </h3>
          <button className="btn btn-icon" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nama Tugas</label>
              <input
                type="text"
                className="form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nama tugas..."
                autoFocus
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Tanggal Mulai</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.startDate || ''}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value || null, isManualSchedule: true })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Durasi (hari kerja)</label>
                <input
                  type="number"
                  className="form-input"
                  min={1}
                  value={form.durationDays}
                  onChange={(e) => setForm({ ...form, durationDays: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Tanggal Selesai: {form.endDate ? formatDate(parseDate(form.endDate)) : '-'}
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Prioritas</label>
                <select
                  className="form-select"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as Task['priority'] })}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Warna</label>
                <div className="color-picker">
                  {COLORS.map((color) => (
                    <div
                      key={color}
                      className={`color-swatch ${form.color === color ? 'selected' : ''}`}
                      style={{ background: color }}
                      onClick={() => setForm({ ...form, color })}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tugas Induk (Parent)</label>
              <select
                className="form-select"
                value={form.parentId || ''}
                onChange={(e) => setForm({ ...form, parentId: e.target.value || null })}
                disabled={hasChildren}
              >
                <option value="">- Tidak ada -</option>
                {parentTasks.filter((t) => !t.parentId).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {hasChildren && (
                <small style={{ color: 'var(--danger)' }}>
                  Tugas ini memiliki sub-tugas, tidak bisa diset sebagai anak.
                </small>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Alokasi Sumber Daya</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {allResources.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`btn btn-sm ${form.resources.includes(r.id) ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => toggleResource(r.id)}
                  >
                    {r.name}
                  </button>
                ))}
                {allResources.length === 0 && (
                  <span style={{ color: 'var(--gray-500)' }}>Belum ada resource</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Dependensi</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <select
                  className="form-select"
                  style={{ flex: '2' }}
                  value={depForm.predecessorId}
                  onChange={(e) => setDepForm({ ...depForm, predecessorId: e.target.value })}
                >
                  <option value="">Pilih tugas sebelumnya</option>
                  {allTasks
                    .filter((t) => t.id !== task?.id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
                <select
                  className="form-select"
                  style={{ flex: '1' }}
                  value={depForm.type}
                  onChange={(e) => setDepForm({ ...depForm, type: e.target.value as Dependency['type'] })}
                >
                  {depTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  className="form-input"
                  style={{ flex: '0.5', minWidth: '60px' }}
                  value={depForm.delayDays}
                  onChange={(e) => setDepForm({ ...depForm, delayDays: parseInt(e.target.value) || 0 })}
                  placeholder="Delay"
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={addDependency}>
                  +
                </button>
              </div>

              {form.dependencies.length > 0 && (
                <div className="table-container" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Predesesor</th>
                        <th>Tipe</th>
                        <th>Delay</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.dependencies.map((dep) => {
                        const pred = allTasks.find((t) => t.id === dep.predecessorId);
                        return (
                          <tr key={dep.id}>
                            <td>{pred?.name || dep.predecessorId}</td>
                            <td>{dep.type}</td>
                            <td>{dep.delayDays >= 0 ? `+${dep.delayDays}` : dep.delayDays} hari</td>
                            <td>
                              <button
                                className="btn btn-icon btn-sm"
                                onClick={() => removeDependency(dep.id)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            {!isNew && (
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                Hapus
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary">
              {isNew ? 'Simpan' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;
