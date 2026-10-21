/**
 * @jest-environment jsdom
 *
 * Test render DOM sesungguhnya (React Testing Library):
 * merender komponen GanttChart dan memeriksa DOM yang dihasilkan.
 */
import { render, screen } from '@testing-library/react';
import GanttChart from '../components/GanttChart';
import { recalculateSchedule } from '../utils/scheduler';
import { createDemoB } from '../demo/demos';

const LABEL_WIDTH = 200;

function px(el: Element, prop: string): number {
  const v = window.getComputedStyle(el).getPropertyValue(prop);
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
}

describe('GanttChart (React Testing Library) - Demo B', () => {
  const demo = createDemoB();
  const scheduled = recalculateSchedule(demo.tasks, demo.dependencies, demo.project!);

  it('merender 10 batang tugas di DOM', () => {
    const { container } = render(
      <GanttChart tasks={scheduled} dependencies={demo.dependencies} project={demo.project} />
    );
    const bars = container.querySelectorAll('[data-task-bar]');
    expect(bars).toHaveLength(10);
  });

  it('setiap tugas A-J memiliki batang dengan tanggal terisi', () => {
    render(
      <GanttChart tasks={scheduled} dependencies={demo.dependencies} project={demo.project} />
    );
    for (const id of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']) {
      const bar = screen.getByLabelText(`Batang tugas ${id}`);
      expect(bar).toBeTruthy();
      // Batang harus menampilkan durasi, bukan kosong
      expect(bar.textContent).toMatch(/\d+ hari/);
    }
  });

  it('semua batang berada di area timeline, bukan di kolom nama', () => {
    const { container } = render(
      <GanttChart tasks={scheduled} dependencies={demo.dependencies} project={demo.project} />
    );
    const bars = container.querySelectorAll('[data-task-bar]');
    bars.forEach((bar) => {
      expect(px(bar, 'left')).toBeGreaterThanOrEqual(LABEL_WIDTH);
      expect(px(bar, 'width')).toBeGreaterThan(0);
    });
  });

  it('rentang kalender membentang penuh sepanjang proyek (bukan cuma 4 hari)', () => {
    const { container } = render(
      <GanttChart tasks={scheduled} dependencies={demo.dependencies} project={demo.project} />
    );
    // Hitung kolom tanggal di header
    const dayCols = container.querySelectorAll('[data-day-column]');
    expect(dayCols.length).toBeGreaterThan(20);
  });

  it('menggambar panah dependensi untuk semua dependensi', () => {
    const { container } = render(
      <GanttChart tasks={scheduled} dependencies={demo.dependencies} project={demo.project} />
    );
    const arrows = container.querySelectorAll('[data-dep-arrow]');
    expect(arrows).toHaveLength(demo.dependencies.length);
  });

  it('batang jalur kritis B-E-H-J dirender merah', () => {
    const { container } = render(
      <GanttChart tasks={scheduled} dependencies={demo.dependencies} project={demo.project} />
    );
    for (const id of ['B', 'E', 'H', 'J']) {
      const bar = container.querySelector(`[data-task-bar="${id}"]`)!;
      expect(bar.getAttribute('data-critical')).toBe('true');
      expect(window.getComputedStyle(bar).backgroundColor).toBe('rgb(239, 68, 68)');
    }
  });

  it('tugas non-kritis tidak berwarna merah', () => {
    const { container } = render(
      <GanttChart tasks={scheduled} dependencies={demo.dependencies} project={demo.project} />
    );
    for (const id of ['A', 'C', 'D', 'F', 'G', 'I']) {
      const bar = container.querySelector(`[data-task-bar="${id}"]`)!;
      expect(bar.getAttribute('data-critical')).toBe('false');
      expect(window.getComputedStyle(bar).backgroundColor).not.toBe('rgb(239, 68, 68)');
    }
  });
});
