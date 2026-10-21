import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import GanttChart from '../components/GanttChart';
import { recalculateSchedule } from '../utils/scheduler';
import { createDemoB } from '../demo/demos';

/**
 * Test RENDER tingkat DOM: merender GanttChart sungguhan menjadi HTML
 * (react-dom/server) untuk membuktikan Demo B menghasilkan 10 batang Gantt
 * yang berada di DALAM area timeline — bukan di kolom nama.
 */

const LABEL_WIDTH = 200;
const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 40;

/** Semua bar tugas dirender sebagai div dengan atribut data-task-bar="id". */
function getBars(html: string): { id: string; style: string }[] {
  const bars: { id: string; style: string }[] = [];
  const re = /<div[^>]*data-task-bar="([^"]*)"[^>]*style="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    bars.push({ id: m[1], style: m[2] });
  }
  return bars;
}

function styleValue(style: string, prop: string): number | null {
  const m = style.match(new RegExp(`(?:^|;)\\s*${prop}:\\s*(-?[\\d.]+)px`));
  return m ? parseFloat(m[1]) : null;
}

describe('Render GanttChart - Demo B', () => {
  const demo = createDemoB();
  const scheduled = recalculateSchedule(demo.tasks, demo.dependencies, demo.project!);
  const html = renderToStaticMarkup(
    React.createElement(GanttChart, {
      tasks: scheduled,
      dependencies: demo.dependencies,
      project: demo.project,
    })
  );

  it('merender tepat 10 batang tugas', () => {
    const bars = getBars(html);
    expect(bars).toHaveLength(10);
  });

  it('setiap tugas memiliki batang (A sampai J)', () => {
    const ids = getBars(html).map((b) => b.id).sort();
    expect(ids).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']);
  });

  it('semua batang berada di area timeline (left >= LABEL_WIDTH), bukan di kolom nama', () => {
    for (const bar of getBars(html)) {
      const left = styleValue(bar.style, 'left');
      expect(left).not.toBeNull();
      expect(left!).toBeGreaterThanOrEqual(LABEL_WIDTH);
    }
  });

  it('setiap batang memiliki lebar positif dan berada di barisnya sendiri', () => {
    const bars = getBars(html);
    for (const bar of bars) {
      expect(styleValue(bar.style, 'width')!).toBeGreaterThan(0);
      // Batang tugas ke-i harus berada di baris ke-i (vertikal tidak tumpang tindih)
      const expectedTop = HEADER_HEIGHT + bars.indexOf(bar) * ROW_HEIGHT;
      expect(styleValue(bar.style, 'top')!).toBeGreaterThanOrEqual(expectedTop);
      expect(styleValue(bar.style, 'top')!).toBeLessThan(expectedTop + ROW_HEIGHT);
    }
    // Batang yang tanggal mulai berbeda harus memiliki left berbeda
    const leftByStart = new Map<string, number>();
    for (const bar of bars) {
      const start = scheduled.find((t) => t.id === bar.id)!.startDate!;
      const left = styleValue(bar.style, 'left')!;
      if (leftByStart.has(start)) {
        expect(leftByStart.get(start)).toBe(left);
      } else {
        leftByStart.set(start, left);
      }
    }
  });

  it('timeline membentang penuh sepanjang proyek (33+ hari kerja)', () => {
    const container = html.match(/data-gantt-timeline="1"[^>]*style="([^"]*)"/);
    expect(container).not.toBeNull();
    const width = styleValue(container![1], 'width');
    // 10 tugas Demo B membentang 33 hari kerja; lebar harus jauh melampaui kolom nama
    expect(width!).toBeGreaterThan(LABEL_WIDTH + 30 * 30);
  });

  it('menggambar panah dependensi (SVG) untuk 10 dependensi', () => {
    const arrows = html.match(/data-dep-arrow="/g);
    expect(arrows).toHaveLength(demo.dependencies.length);
  });

  it('batang jalur kritis B-E-H-J dirender merah', () => {
    const bars = getBars(html);
    for (const id of ['B', 'E', 'H', 'J']) {
      const bar = bars.find((b) => b.id === id);
      expect(bar).toBeDefined();
      expect(bar!.style).toContain('#ef4444');
    }
  });
});
