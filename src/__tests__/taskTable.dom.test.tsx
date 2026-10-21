/**
 * @jest-environment jsdom
 *
 * Test render DOM (React Testing Library) untuk tab Tugas.
 * Membuktikan Demo B menghasilkan kolom Mulai dan Selesai terisi untuk 10 tugas,
 * serta header tabel memakai bahasa Indonesia (Induk, Sumber Daya).
 */
import { render } from '@testing-library/react';
import App from '../App';
import useAppData from '../hooks/useAppData';
import { recalculateSchedule } from '../utils/scheduler';
import { createDemoB } from '../demo/demos';

const demo = createDemoB();
const scheduled = recalculateSchedule(demo.tasks, demo.dependencies, demo.project!);

jest.mock('../hooks/useAppData');

const mockUseAppData = useAppData as jest.Mock;

function makeHookResult() {
  return {
    data: demo,
    scheduledTasks: scheduled,
    setProject: jest.fn(),
    addTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
    addResource: jest.fn(),
    updateResource: jest.fn(),
    deleteResource: jest.fn(),
    updateProjectSettings: jest.fn(),
    addHoliday: jest.fn(),
    removeHoliday: jest.fn(),
    resetAll: jest.fn(),
    loadDemo: jest.fn(),
    persist: jest.fn(),
  };
}

describe('Tab Tugas (React Testing Library) - Demo B', () => {
  beforeEach(() => {
    mockUseAppData.mockReturnValue(makeHookResult());
  });

  it('header tabel memakai bahasa Indonesia: Induk dan Sumber Daya', () => {
    render(<App />);
    // Batasi ke header tabel; "Sumber Daya" juga muncul sebagai label tab navigasi
    const headers = Array.from(document.querySelectorAll('th')).map(
      (th) => th.textContent?.trim() || ''
    );
    expect(headers).toContain('Induk');
    expect(headers).toContain('Sumber Daya');
    // Tidak boleh ada header tabel bahasa Inggris yang tersisa
    expect(headers).not.toContain('PARENT');
    expect(headers).not.toContain('RESOURCE');
    expect(headers).not.toContain('Parent');
    expect(headers).not.toContain('Resource');
  });

  it('menampilkan 10 baris tugas (A sampai J)', () => {
    const { container } = render(<App />);
    const rows = container.querySelectorAll('[data-task-row]');
    expect(rows).toHaveLength(10);
  });

  it('kolom Mulai terisi untuk SEMUA 10 tugas (bukan "-")', () => {
    const { container } = render(<App />);
    const rows = container.querySelectorAll('[data-task-row]');
    rows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      // sel ke-1 = nama, ke-2 = Mulai, ke-3 = Selesai
      expect(cells[1].textContent).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('kolom Selesai terisi untuk SEMUA 10 tugas (bukan "-")', () => {
    const { container } = render(<App />);
    const rows = container.querySelectorAll('[data-task-row]');
    rows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      expect(cells[2].textContent).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('A, B, C mulai 2025-01-01; D-J memiliki tanggal sebelumnya', () => {
    const { container } = render(<App />);
    const byId = new Map<string, HTMLElement>();
    container.querySelectorAll<HTMLElement>('[data-task-row]').forEach((row) => {
      byId.set(row.getAttribute('data-task-row')!, row);
    });
    for (const id of ['A', 'B', 'C']) {
      expect(byId.get(id)!.querySelectorAll('td')[1].textContent).toBe('2025-01-01');
    }
    for (const id of ['D', 'E', 'F', 'G', 'H', 'I', 'J']) {
      const start = byId.get(id)!.querySelectorAll('td')[1].textContent!;
      expect(start).not.toBe('-');
      expect(start).not.toBe('2025-01-01');
    }
  });

  it('setiap tugas memiliki tanggal selesai setelah atau sama dengan tanggal mulai', () => {
    const { container } = render(<App />);
    container.querySelectorAll<HTMLElement>('[data-task-row]').forEach((row) => {
      const cells = row.querySelectorAll('td');
      // Tugas 1 hari kerja (mis. A) boleh berakhir di hari yang sama dengan mulai
      expect(cells[2].textContent! >= cells[1].textContent!).toBe(true);
    });
  });
});
