import { FC, useMemo } from 'react';
import { Task, Dependency, PathInfo } from '../types';
import { findAllPaths, computeFullSchedule } from '../utils/scheduler';
import { Project } from '../types';

interface Props {
  tasks: Task[];
  dependencies: Dependency[];
  project: Project | null;
}

const CriticalPathAnalysis: FC<Props> = ({ tasks, dependencies, project }) => {
  const { paths, criticalPath, maxDuration } = useMemo(() => {
    if (!project || tasks.length === 0) {
      return { paths: [] as PathInfo[], criticalPath: [] as PathInfo[], maxDuration: 0 };
    }

    const allPaths = findAllPaths(tasks, dependencies);
    const critical = allPaths.filter((p) => p.isCritical);
    const maxDur = critical.length > 0 ? critical[0].duration : 0;

    return {
      paths: allPaths,
      criticalPath: critical,
      maxDuration: maxDur,
    };
  }, [tasks, dependencies, project]);

  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const scheduleResults = useMemo(() => {
    if (!project) return [];
    return computeFullSchedule(tasks, dependencies, project);
  }, [tasks, dependencies, project]);

  if (tasks.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Analisis Jalur Kritis</h3>
        </div>
        <div className="empty-state">
          <h3>Belum ada tugas</h3>
          <p>Tambahkan tugas dan dependensi untuk Analisis Jalur Kritis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Analisis Jalur Kritis</h3>
        {criticalPath.length > 0 && (
          <span className="badge badge-tinggi" style={{ background: '#fef2f2', color: '#991b1b' }}>
            {criticalPath.length} jalur kritis ditemukan
          </span>
        )}
      </div>

      {/* Summary */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total Jalur</div>
          <div className="stat-value">{paths.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Jalur Kritis</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>
            {criticalPath.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Durasi Terpanjang</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>
            {maxDuration} hari
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Aktifitas</div>
          <div className="stat-value">{tasks.length}</div>
        </div>
      </div>

      {/* Critical path summary */}
      {criticalPath.length > 0 && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius)',
            padding: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#991b1b', marginBottom: '0.5rem' }}>
            Jalur Kritis (total {maxDuration} hari kerja)
          </div>
          {criticalPath.map((path, idx) => (
            <div key={idx} style={{ fontSize: '0.8125rem', color: '#7f1d1d', marginBottom: '0.25rem' }}>
              {path.path.map((id, i) => (
                <span key={id} style={{ marginRight: '0.25rem' }}>
                  {taskMap.get(id)?.name}
                  {i < path.path.length - 1 && ' → '}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* All paths table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Jalur</th>
              <th>Aktifitas</th>
              <th>Durasi (hari)</th>
              <th>Status</th>
              <th>Selisih Waktu (Float)</th>
            </tr>
          </thead>
          <tbody>
            {paths.map((path, idx) => {
              const pathTasks = path.path.map((id) => taskMap.get(id)!).filter(Boolean);
              const totalFloat = pathTasks.length > 0
                ? Math.max(...pathTasks.map((t) => {
                    const sched = scheduleResults.find((s) => s.taskId === t.id);
                    return sched?.totalFloat ?? 0;
                  }))
                : 0;

              return (
                <tr
                  key={idx}
                  className={path.isCritical ? 'critical-path-row' : ''}
                  style={
                    path.isCritical
                      ? {
                          background: '#fef2f2',
                          borderLeft: '3px solid var(--danger)',
                        }
                      : {}
                  }
                >
                  <td>{idx + 1}</td>
                  <td>
                    <strong style={{ color: path.isCritical ? 'var(--danger)' : 'inherit' }}>
                      Jalur {idx + 1}
                    </strong>
                  </td>
                  <td>
                    <div className="path-tasks">
                      {pathTasks.map((t) => (
                        <span
                          key={t.id}
                          className={`path-task-badge ${path.isCritical ? 'critical' : ''}`}
                          style={{
                            background: path.isCritical ? 'var(--danger)' : t.color + '20',
                            color: path.isCritical ? 'white' : t.color,
                          }}
                        >
                          {t.name} ({t.durationDays}d)
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: '600',
                        color: path.isCritical ? 'var(--danger)' : 'inherit',
                      }}
                    >
                      {path.duration} hari
                    </span>
                  </td>
                  <td>
                    {path.isCritical ? (
                      <span className="badge badge-tinggi" style={{ background: '#fef2f2', color: '#991b1b' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                          <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Kritis
                      </span>
                    ) : (
                      <span
                        className="badge"
                        style={{
                          background: '#f0fdf4',
                          color: '#166534',
                        }}
                      >
                        Non-Kritis
                      </span>
                    )}
                  </td>
                  <td>
                    {path.isCritical ? (
                      <span style={{ color: 'var(--gray-500)' }}>-</span>
                    ) : (
                      <span style={{ color: 'var(--gray-600)' }}>{totalFloat} hari</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Explanation */}
      <div
        style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: 'var(--gray-50)',
          borderRadius: 'var(--radius)',
          fontSize: '0.875rem',
          color: 'var(--gray-600)',
          border: '1px solid var(--gray-200)',
        }}
      >
        <div style={{ fontWeight: '600', color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
          📊 Penjelasan
        </div>
        <p>
          <strong>Jalur kritis</strong> adalah jalur terpanjang dalam jaringan proyek yang menentukan durasi minimum proyek.
          Setiap delay pada aktivitas di jalur kritis akan mengakibatkan delay pada seluruh proyek.
        </p>
        <p style={{ marginTop: '0.5rem' }}>
          <strong>Total Float (Float)</strong> adalah jumlah waktu yang dapat ditunda oleh sebuah aktivitas tanpa mempengaruhi
          tanggal selesai proyek. Aktivitas pada jalur kritis memiliki total float = 0.
        </p>
        <p style={{ marginTop: '0.5rem' }}>
          Pada tabel di atas, jalur dengan durasi terpanjang ditandai dengan warna merah dan badge "Kritis".
          Aktivitas pada jalur kritis memiliki warna border merah.
        </p>
      </div>
    </div>
  );
};

export default CriticalPathAnalysis;
