import { FC, useState } from 'react';
import { Project, Holiday } from '../types';
import { parseDate, formatDate } from '../utils/dateUtils';

interface Props {
  project: Project | null;
  onUpdate: (updates: Partial<Project>) => void;
  onAddHoliday: (holiday: Omit<Holiday, 'id'>) => void;
  onRemoveHoliday: (id: string) => void;
}

const ProjectSettings: FC<Props> = ({ project, onUpdate, onAddHoliday, onRemoveHoliday }) => {
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [newHoliday, setNewHoliday] = useState<Partial<Holiday>>({
    name: '',
    date: '',
    type: 'one-off' as const,
    month: 1,
    day: 1,
    until: '',
  });

  if (!project) {
    return (
      <div className="empty-state">
        <h3>Belum ada proyek</h3>
        <p>Buat proyek baru untuk memulai.</p>
      </div>
    );
  }

  const handleAddHoliday = () => {
    if (!newHoliday.name || (!newHoliday.date && (newHoliday.type === 'recurring' ? !newHoliday.month : true))) {
      return;
    }

    if (newHoliday.type === 'one-off') {
      onAddHoliday({
        name: newHoliday.name!,
        date: newHoliday.date!,
        type: 'one-off',
      } as Omit<Holiday, 'id'>);
    } else {
      onAddHoliday({
        name: newHoliday.name!,
        type: 'recurring',
        month: newHoliday.month ?? 1,
        day: newHoliday.day ?? 1,
        until: newHoliday.until || undefined,
      } as Omit<Holiday, 'id'>);
    }

    setNewHoliday({
      name: '',
      date: '',
      type: 'one-off',
      month: 1,
      day: 1,
      until: '',
    });
    setShowHolidayForm(false);
  };

  const holidayTypes: { value: 'one-off' | 'recurring'; label: string }[] = [
    { value: 'one-off', label: 'Hari libur spesifik (tanggal)' },
    { value: 'recurring', label: 'Hari libur rutin (bulanan)' },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Pengaturan Proyek</h3>
      </div>

      <div className="form-group">
        <label className="form-label">Nama Proyek</label>
        <input
          type="text"
          className="form-input"
          value={project.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Organisasi</label>
        <input
          type="text"
          className="form-input"
          value={project.organization}
          onChange={(e) => onUpdate({ organization: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Website</label>
        <input
          type="url"
          className="form-input"
          value={project.website}
          onChange={(e) => onUpdate({ website: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="form-group">
        <label className="form-label">Deskripsi</label>
        <textarea
          className="form-textarea"
          value={project.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Deskripsi proyek..."
        />
      </div>

      <div className="form-group">
        <label className="form-checkbox">
          <input
            type="checkbox"
            checked={project.weekendHoliday}
            onChange={(e) => onUpdate({ weekendHoliday: e.target.checked })}
          />
          <span>
            Weekend (Sabtu-Minggu) adalah hari libur
          </span>
        </label>
      </div>

      <div className="form-group">
        <label className="form-label">Hari Libur Custom</label>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowHolidayForm(!showHolidayForm)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Tambah Hari Libur
          </button>
        </div>

        {showHolidayForm && (
          <div style={{ background: 'var(--gray-50)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Nama Hari Libur</label>
              <input
                type="text"
                className="form-input"
                value={newHoliday.name}
                onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                placeholder="Contoh: Hari Raya"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Jenis</label>
              <select
                className="form-select"
                value={newHoliday.type}
                onChange={(e) => setNewHoliday({ ...newHoliday, type: e.target.value as 'one-off' | 'recurring' })}
              >
                {holidayTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {newHoliday.type === 'one-off' ? (
              <div className="form-group">
                <label className="form-label">Tanggal</label>
                <input
                  type="date"
                  className="form-input"
                  value={newHoliday.date}
                  onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                />
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Bulan</label>
                  <select
                    className="form-select"
                    value={newHoliday.month}
                    onChange={(e) => setNewHoliday({ ...newHoliday, month: parseInt(e.target.value) })}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('id', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tanggal dalam bulan</label>
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    max={31}
                    value={newHoliday.day}
                    onChange={(e) => setNewHoliday({ ...newHoliday, day: parseInt(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Sampai dengan tanggal (opsional)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newHoliday.until}
                    onChange={(e) => setNewHoliday({ ...newHoliday, until: e.target.value })}
                  />
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-primary btn-sm" onClick={handleAddHoliday}>
                Simpan
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowHolidayForm(false)}>
                Batal
              </button>
            </div>
          </div>
        )}

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Tanggal</th>
                <th>Tipe</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {project.customHolidays.map((holiday) => (
                <tr key={holiday.id}>
                  <td>{holiday.name}</td>
                  <td>
                    {holiday.type === 'one-off'
                      ? formatDate(parseDate(holiday.date))
                      : `${new Date(0, holiday.month! - 1).toLocaleString('id', { month: 'long' })} ${holiday.day}`}
                  </td>
                  <td>
                    <span className="badge badge-sedang">
                      {holiday.type === 'one-off' ? 'One-off' : 'Rutin'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-icon btn-sm"
                      onClick={() => onRemoveHoliday(holiday.id)}
                      title="Hapus"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {project.customHolidays.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-500)' }}>
                    Belum ada hari libur custom
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProjectSettings;
