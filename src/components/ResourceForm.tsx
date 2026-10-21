import { FC, useState } from 'react';
import { Resource } from '../types';

interface Props {
  resource: Resource | null;
  onSave: (resource: Resource) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  isNew: boolean;
}

const ResourceForm: FC<Props> = ({ resource, onSave, onDelete, onClose, isNew }) => {
  const [form, setForm] = useState<Resource>({
    id: resource?.id || '',
    name: resource?.name || '',
    phone: resource?.phone || '',
    email: resource?.email || '',
    role: resource?.role || '',
    salary: resource?.salary ?? null,
    personalHolidays: resource?.personalHolidays || [],
    createdAt: resource?.createdAt || '',
    updatedAt: resource?.updatedAt || '',
  });

  const [newHoliday, setNewHoliday] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  const handleDelete = () => {
    if (resource && confirm('Hapus resource ini?')) {
      onDelete(resource.id);
      onClose();
    }
  };

  const addHoliday = () => {
    if (!newHoliday) return;
    setForm((prev) => ({
      ...prev,
      personalHolidays: [...prev.personalHolidays, newHoliday],
    }));
    setNewHoliday('');
  };

  const removeHoliday = (date: string) => {
    setForm((prev) => ({
      ...prev,
      personalHolidays: prev.personalHolidays.filter((d) => d !== date),
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">            <h3 className="modal-title">
            {isNew ? 'Sumber Daya Baru' : (resource?.name || 'Edit Sumber Daya')}
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
              <label className="form-label">Nama</label>
              <input
                type="text"
                className="form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nama resource..."
                autoFocus
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Telepon</label>
                <input
                  type="tel"
                  className="form-input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0812..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Peran</label>
              <input
                type="text"
                className="form-input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="Project Manager, Developer, dll..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Gaji (opsional)</label>
              <input
                type="number"
                className="form-input"
                value={form.salary ?? ''}
                onChange={(e) => setForm({ ...form, salary: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="Rp 0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hari Libur Pribadi</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="date"
                  className="form-input"
                  value={newHoliday}
                  onChange={(e) => setNewHoliday(e.target.value)}
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={addHoliday}>
                  Tambah
                </button>
              </div>
              {form.personalHolidays.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {form.personalHolidays.map((d) => (
                    <span key={d} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ background: 'var(--gray-200)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                        {d}
                      </span>
                      <button
                        className="btn btn-icon btn-sm"
                        onClick={() => removeHoliday(d)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
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

export default ResourceForm;
