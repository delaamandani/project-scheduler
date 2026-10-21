import { FC } from 'react';

interface HeaderProps {
  onNewProject: () => void;
  onReset: () => void;
  onLoadDemoA: () => void;
  onLoadDemoB: () => void;
  onExport: () => void;
  onImport: () => void;
  projectName: string | null;
}

const Header: FC<HeaderProps> = ({
  onNewProject,
  onReset,
  onLoadDemoA,
  onLoadDemoB,
  onExport,
  onImport,
  projectName,
}) => {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 3v18" />
            <path d="M8 12h4M8 16h2" />
          </svg>
          Project Scheduler
        </div>
        {projectName && (
          <span style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
            | {projectName}
          </span>
        )}
      </div>
      <div className="header-actions">
        <button className="btn btn-primary" onClick={onNewProject}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Proyek Baru
        </button>
        <button className="btn btn-secondary" onClick={onLoadDemoA}>
          Muat Contoh A
        </button>
        <button className="btn btn-secondary" onClick={onLoadDemoB}>
          Muat Contoh B
        </button>
        <button className="btn btn-outline" onClick={onExport}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Ekspor JSON
        </button>
        <button className="btn btn-outline" onClick={onImport}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          Impor JSON
        </button>
        <button className="btn btn-danger" onClick={onReset}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 119 9 9 9 0 01-9-9z" />
            <path d="M3 3v6h6" />
          </svg>
          Atur Ulang
        </button>
      </div>
    </header>
  );
};

export default Header;
