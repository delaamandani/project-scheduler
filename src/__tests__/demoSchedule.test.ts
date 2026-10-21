import { recalculateSchedule, computeFullSchedule } from '../utils/scheduler';
import { parseDate } from '../utils/dateUtils';
import { createDemoA, createDemoB } from '../demo/demos';
import { AppData } from '../types';

/**
 * Test "render-level": memverifikasi DATA yang dikirim ke komponen
 * (tab Tugas, Bagan Gantt, PERT) setelah penjadwalan otomatis berjalan.
 */

function scheduleDemo(demo: AppData) {
  return recalculateSchedule(demo.tasks, demo.dependencies, demo.project!);
}

describe('Demo B - 10 aktivitas: jadwal otomatis terisi untuk SEMUA tugas', () => {
  const demo = createDemoB();
  const scheduled = scheduleDemo(demo);
  const byId = new Map(scheduled.map((t) => [t.id, t]));

  it('menghasilkan 10 tugas dengan startDate dan endDate terisi', () => {
    expect(scheduled.length).toBe(10);
    for (const task of scheduled) {
      expect(task.startDate).not.toBeNull();
      expect(task.startDate).not.toBe('');
      expect(task.endDate).not.toBeNull();
      expect(task.endDate).not.toBe('');
    }
  });

  it('tugas tanpa predecessor (A, B, C) mulai di tanggal mulai proyek', () => {
    expect(byId.get('A')?.startDate).toBe('2025-01-01');
    expect(byId.get('B')?.startDate).toBe('2025-01-01');
    expect(byId.get('C')?.startDate).toBe('2025-01-01');
  });

  it('tugas bergantung D sampai J memiliki tanggal mulai SETELAH sebelumnya selesai', () => {
    expect(byId.get('D')?.startDate).toBe('2025-01-02'); // FS dari A (selesai 1 Jan)
    expect(byId.get('E')?.startDate).toBe('2025-01-03'); // FS dari B (selesai 2 Jan)
    expect(byId.get('F')?.startDate).toBe('2025-01-03'); // FS dari B
    expect(byId.get('G')?.startDate).toBe('2025-01-04'); // FS dari C (selesai 3 Jan)
  });

  it('H mulai setelah D dan E selesai (ambil yang terlambat)', () => {
    const dEnd = byId.get('D')!.endDate!;
    const eEnd = byId.get('E')!.endDate!;
    const hStart = byId.get('H')!.startDate!;
    expect(parseDate(hStart) > parseDate(dEnd)).toBe(true);
    expect(parseDate(hStart) > parseDate(eEnd)).toBe(true);
  });

  it('J mulai setelah F, H, dan I selesai', () => {
    const fEnd = byId.get('F')!.endDate!;
    const hEnd = byId.get('H')!.endDate!;
    const iEnd = byId.get('I')!.endDate!;
    const jStart = byId.get('J')!.startDate!;
    expect(parseDate(jStart) > parseDate(fEnd)).toBe(true);
    expect(parseDate(jStart) > parseDate(hEnd)).toBe(true);
    expect(parseDate(jStart) > parseDate(iEnd)).toBe(true);
  });

  it('proyek selesai (J) membutuhkan 33 hari kerja: total EF = 33 → J mulai offset 30', () => {
    const project = demo.project!;
    const schedule = computeFullSchedule(scheduled, demo.dependencies, project);
    const j = schedule.find((s) => s.taskId === 'J');
    expect(j?.earlyFinish).toBe('33');
    const h = schedule.find((s) => s.taskId === 'H');
    expect(h?.earlyFinish).toBe('30');
  });

  it('jalur kritis B-E-H-J teridentifikasi', () => {
    const schedule = computeFullSchedule(scheduled, demo.dependencies, demo.project!);
    const critical = schedule.filter((s) => s.isCritical).map((s) => s.taskId).sort();
    expect(critical).toEqual(['B', 'E', 'H', 'J'].sort());
  });
});

describe('Demo A - PT XYZ: tidak ada mulai/selesai di Sabtu, Minggu, atau 17 Juli', () => {
  const demo = createDemoA();
  const scheduled = scheduleDemo(demo);

  it('semua tugas memiliki startDate dan endDate terisi', () => {
    expect(scheduled.length).toBe(6);
    for (const task of scheduled) {
      expect(task.startDate).not.toBeNull();
      expect(task.endDate).not.toBeNull();
    }
  });

  it('tidak ada tanggal mulai/akhir di weekend atau 2025-07-17', () => {
    for (const task of scheduled) {
      for (const dateStr of [task.startDate!, task.endDate!]) {
        const d = parseDate(dateStr);
        const day = d.getDay();
        expect(day === 0 || day === 6).toBe(false);
        expect(dateStr).not.toBe('2025-07-17');
      }
    }
  });

  it('Analisis Kebutuhan mulai 30 Jun (Senin) dan berakhir 4 Juli (Jumat, 5 hari kerja)', () => {
    const t1 = scheduled[0];
    expect(t1.name).toBe('Analisis Kebutuhan');
    expect(t1.startDate).toBe('2025-06-30');
    expect(t1.endDate).toBe('2025-07-04');
  });

  it('rantai FS: tugas berikutnya mulai pada hari kerja setelah sebelumnya selesai', () => {
    const byName = new Map(scheduled.map((t) => [t.name, t]));
    // Perancangan -> Implementasi (FS)
    const perancangan = byName.get('Perancangan')!;
    const implementasi = byName.get('Implementasi')!;
    const pengujian = byName.get('Pengujian')!;
    const deploy = byName.get('Deploy dan Maintenance')!;

    expect(parseDate(implementasi.startDate!) > parseDate(perancangan.endDate!)).toBe(true);
    expect(parseDate(pengujian.startDate!) > parseDate(implementasi.endDate!)).toBe(true);
    expect(parseDate(deploy.startDate!) > parseDate(pengujian.endDate!)).toBe(true);
  });

  it('semua tugas berada dalam rentang proyek 30 Jun - 31 Jul+ (tidak mundur ke masa lalu)', () => {
    for (const task of scheduled) {
      expect(parseDate(task.startDate!).getTime()).toBeGreaterThanOrEqual(
        parseDate('2025-06-30').getTime()
      );
    }
  });
});
