import { FC, useMemo } from 'react';
import { Task, Dependency, Project } from '../types';
import { parseDate, formatDate, getHolidaySet, addDays } from '../utils/dateUtils';
import { computeFullSchedule, findAllPaths } from '../utils/scheduler';

interface Props {
  tasks: Task[];
  dependencies: Dependency[];
  project: Project | null;
}

const DAY_WIDTH = 30;
const ROW_HEIGHT = 44;
const LABEL_WIDTH = 200;
const HEADER_HEIGHT = 40;

const DAY_MS = 24 * 60 * 60 * 1000;

interface BarPos {
  left: number; // px dari kiri kontainer (SUDAH termasuk LABEL_WIDTH)
  width: number;
  dayIndex: number;
}

const GanttChart: FC<Props> = ({ tasks, dependencies, project }) => {
  // Hasil penjadwalan (tanggal + status kritis) dihitung dari task yang diberikan.
  const scheduleResults = useMemo(() => {
    if (!project) return [];
    return computeFullSchedule(tasks, dependencies, project);
  }, [tasks, dependencies, project]);

  const criticalPaths = useMemo(() => {
    if (!project) return [];
    return findAllPaths(tasks, dependencies);
  }, [tasks, dependencies, project]);

  const criticalTaskIds = useMemo(() => {
    const ids = new Set<string>();
    for (const path of criticalPaths) {
      if (path.isCritical) for (const id of path.path) ids.add(id);
    }
    return ids;
  }, [criticalPaths]);

  // Rentang kalender = tanggal mulai paling awal s/d tanggal selesai paling akhir (+ 3 hari)
  const { timelineStart, totalDays } = useMemo(() => {
    if (tasks.length === 0) {
      const now = new Date();
      return { timelineStart: now, totalDays: 0 };
    }
    let start: Date | null = null;
    let end: Date | null = null;
    for (const t of tasks) {
      if (t.startDate) {
        const d = parseDate(t.startDate);
        if (!start || d < start) start = d;
      }
      if (t.endDate) {
        const d = parseDate(t.endDate);
        if (!end || d > end) end = d;
        // batang berbasis durasi bisa lebih panjang dari endDate; jaga keduanya
        const durEnd = addDays(d, Math.max(0, t.durationDays - 1));
        if (!end || durEnd > end) end = durEnd;
      }
    }
    if (!start) start = new Date();
    if (!end) end = start;
    const paddedEnd = addDays(end, 3);
    const days = Math.round((paddedEnd.getTime() - start.getTime()) / DAY_MS) + 1;
    return { timelineStart: start, totalDays: Math.max(days, 1) };
  }, [tasks]);

  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const rowIndex = useMemo(() => new Map(tasks.map((t, i) => [t.id, i])), [tasks]);

  const getBarPos = (task: Task): BarPos | null => {
    if (!task.startDate) return null;
    const s = parseDate(task.startDate);
    let dayIndex = Math.round((s.getTime() - timelineStart.getTime()) / DAY_MS);
    if (dayIndex < 0) dayIndex = 0;
    if (dayIndex > totalDays - 1) dayIndex = totalDays - 1;

    const endDateStr = task.endDate ?? formatDate(addDays(s, Math.max(0, task.durationDays - 1)));
    let endIdx = Math.round((parseDate(endDateStr).getTime() - timelineStart.getTime()) / DAY_MS);
    if (endIdx < dayIndex) endIdx = dayIndex;
    if (endIdx > totalDays - 1) endIdx = totalDays - 1;

    return {
      left: LABEL_WIDTH + dayIndex * DAY_WIDTH,
      width: Math.max((endIdx - dayIndex + 1) * DAY_WIDTH, DAY_WIDTH),
      dayIndex,
    };
  };

  // Koordinat panah dependensi (SVG overlay)
  const arrows = useMemo(() => {
    const list: {
      id: string;
      from: { x: number; y: number };
      to: { x: number; y: number };
      isCritical: boolean;
    }[] = [];

    for (const dep of dependencies) {
      const pred = taskMap.get(dep.predecessorId);
      const succ = taskMap.get(dep.successorId);
      if (!pred || !succ) continue;
      const predPos = getBarPos(pred);
      const succPos = getBarPos(succ);
      if (!predPos || !succPos) continue;

      const predRow = rowIndex.get(pred.id) ?? 0;
      const succRow = rowIndex.get(succ.id) ?? 0;
      const y1 = HEADER_HEIGHT + predRow * ROW_HEIGHT + ROW_HEIGHT / 2;
      const y2 = HEADER_HEIGHT + succRow * ROW_HEIGHT + ROW_HEIGHT / 2;

      // Titik keluar dan masuk sesuai tipe dependensi
      const exitAtEnd = dep.type === 'FS' || dep.type === 'FF';
      const enterAtEnd = dep.type === 'FF' || dep.type === 'SF';

      const x1 = exitAtEnd ? predPos.left + predPos.width : predPos.left;
      const x2 = enterAtEnd ? succPos.left + succPos.width : succPos.left;
      const isCritical =
        criticalTaskIds.has(dep.predecessorId) && criticalTaskIds.has(dep.successorId);

      list.push({ id: dep.id, from: { x: x1, y: y1 }, to: { x: x2, y: y2 }, isCritical });
    }
    return list;
  }, [dependencies, taskMap, rowIndex, timelineStart, totalDays, criticalTaskIds]);

  const svgWidth = LABEL_WIDTH + totalDays * DAY_WIDTH;
  const svgHeight = HEADER_HEIGHT + tasks.length * ROW_HEIGHT + 10;

  const holidaySetForYear = (year: number) =>
    project ? getHolidaySet(project.customHolidays, project.weekendHoliday, year) : new Set<string>();

  if (tasks.length === 0) {
    return (
      <div className="gantt-container">
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 3v18" />
            <path d="M8 12h4M8 16h2" />
          </svg>
          <h3>Belum ada tugas</h3>
          <p>Tambahkan tugas untuk melihat bagan Gantt.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gantt-container">
      <div className="gantt-toolbar">
        <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
          Rentang: {formatDate(timelineStart)} s/d {formatDate(addDays(timelineStart, totalDays - 1))}
        </span>
        <div style={{ flex: 1 }} />
        <small style={{ color: 'var(--gray-500)' }}>
          Jalur kritis: {criticalPaths.filter((p) => p.isCritical).map((p) => p.duration).join(', ') || '-'} hari
        </small>
      </div>

      <div className="gantt-chart">
        <div
          style={{
            position: 'relative',
            width: svgWidth,
            height: svgHeight,
            minWidth: '100%',
          }}
        >
          {/* ===== Header ===== */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: LABEL_WIDTH,
              height: HEADER_HEIGHT,
              background: '#f8fafc',
              borderRight: '1px solid #e2e8f0',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600,
              color: '#64748b',
              zIndex: 20,
            }}
          >
            Nama Tugas
          </div>

          {/* Header tanggal */}
          {Array.from({ length: totalDays }, (_, i) => {
            const date = addDays(timelineStart, i);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isHoliday = holidaySetForYear(date.getFullYear()).has(formatDate(date));
            return (
              <div
                key={`h-${i}`}
                data-day-column={formatDate(date)}
                style={{
                  position: 'absolute',
                  left: LABEL_WIDTH + i * DAY_WIDTH,
                  top: 0,
                  width: DAY_WIDTH,
                  height: HEADER_HEIGHT,
                  background: isWeekend ? '#fef2f2' : isHoliday ? '#fffbeb' : '#f8fafc',
                  borderRight: '1px solid #e2e8f0',
                  borderBottom: '1px solid #e2e8f0',
                  textAlign: 'center',
                  fontSize: 10,
                  color: isWeekend || isHoliday ? '#b91c1c' : '#64748b',
                  zIndex: 20,
                }}
              >
                <div style={{ fontWeight: 600, lineHeight: '14px' }}>{date.getDate()}</div>
                <div style={{ fontSize: 9, lineHeight: '10px', color: '#94a3b8' }}>
                  {date.toLocaleString('id', { weekday: 'short' })}
                </div>
              </div>
            );
          })}

          {/* ===== Pita weekend / hari libur (belakang batang) ===== */}
          {Array.from({ length: totalDays }, (_, i) => {
            const date = addDays(timelineStart, i);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isHoliday = holidaySetForYear(date.getFullYear()).has(formatDate(date));
            if (!isWeekend && !isHoliday) return null;
            return (
              <div
                key={`band-${i}`}
                style={{
                  position: 'absolute',
                  left: LABEL_WIDTH + i * DAY_WIDTH,
                  top: HEADER_HEIGHT,
                  width: DAY_WIDTH,
                  height: tasks.length * ROW_HEIGHT,
                  background: isWeekend ? 'rgba(254,226,226,0.45)' : 'rgba(254,249,195,0.45)',
                  zIndex: 1,
                }}
              />
            );
          })}

          {/* ===== Area timeline (kontainer posisi batang) ===== */}
          <div data-gantt-timeline="1" style={{ position: 'absolute', left: 0, top: 0, width: svgWidth, height: svgHeight }} />

          {/* ===== Baris label + grid baris ===== */}
          {tasks.map((task, idx) => {
            return (
              <div
                key={`row-${task.id}`}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: HEADER_HEIGHT + idx * ROW_HEIGHT,
                  width: svgWidth,
                  height: ROW_HEIGHT,
                  borderBottom: '1px solid #f1f5f9',
                  background: idx % 2 === 0 ? 'white' : '#fafbfc',
                  zIndex: 2,
                }}
              />
            );
          })}
          {tasks.map((task, idx) => {
            const schedule = scheduleResults.find((s) => s.taskId === task.id);
            const isCritical = schedule?.isCritical || false;
            return (
              <div
                key={`label-${task.id}`}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: HEADER_HEIGHT + idx * ROW_HEIGHT,
                  width: LABEL_WIDTH,
                  height: ROW_HEIGHT,
                  borderRight: '1px solid #e2e8f0',
                  background: isCritical ? '#fef2f2' : 'white',
                  padding: '6px 8px',
                  fontSize: 12,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  zIndex: 15,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: task.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {task.name}
                  {tasks.some((t) => t.parentId === task.id) && (
                    <span style={{ fontSize: 9, color: '#94a3b8' }}> (ringkasan)</span>
                  )}
                </span>
                {isCritical && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: '#ef4444',
                      color: 'white',
                      borderRadius: 3,
                      fontSize: 9,
                      padding: '1px 4px',
                      flexShrink: 0,
                    }}
                  >
                    !
                  </span>
                )}
              </div>
            );
          })}

          {/* ===== Batang tugas (position absolute di area timeline) ===== */}
          {tasks.map((task, idx) => {
            const pos = getBarPos(task);
            if (!pos) return null;
            const schedule = scheduleResults.find((s) => s.taskId === task.id);
            const isCritical = schedule?.isCritical || false;
            const isSummary = tasks.some((t) => t.parentId === task.id);
            const top = HEADER_HEIGHT + idx * ROW_HEIGHT + (ROW_HEIGHT - 24) / 2;

            return (
              <div
                key={`bar-${task.id}`}
                data-task-bar={task.id}
                data-critical={isCritical ? 'true' : 'false'}
                aria-label={`Batang tugas ${task.id}`}
                title={`${task.name}: ${task.startDate ?? '-'} s/d ${task.endDate ?? '-'} (${task.durationDays} hari kerja)${isCritical ? ' — JALUR KRITIS' : ''}`}
                style={{
                  position: 'absolute',
                  left: pos.left,
                  top,
                  width: pos.width,
                  height: isSummary ? 14 : 24,
                  marginTop: isSummary ? 5 : 0,
                  borderRadius: 4,
                  background: isCritical ? '#ef4444' : task.color + (isSummary ? '' : '33'),
                  border: `1px solid ${isCritical ? '#b91c1c' : task.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isSummary ? 'center' : 'flex-start',
                  paddingLeft: isSummary ? 0 : 6,
                  fontSize: 10,
                  color: isCritical ? 'white' : task.color,
                  fontWeight: 600,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                }}
              >
                {isSummary ? '▼' : `${task.durationDays} hari`}
              </div>
            );
          })}

          {/* ===== Overlay SVG panah dependensi ===== */}
          <svg
            width={svgWidth}
            height={svgHeight}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              pointerEvents: 'none',
              zIndex: 12,
            }}
          >
            <defs>
              <marker id="gh-normal" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
              </marker>
              <marker id="gh-critical" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
              </marker>
            </defs>
            {arrows.map((a, i) => {
              const elbowMid = a.from.x + 8;
              const d =
                a.to.x > elbowMid
                  ? `M ${a.from.x} ${a.from.y} L ${elbowMid} ${a.from.y} L ${elbowMid} ${a.to.y} L ${a.to.x - 6} ${a.to.y}`
                  : // mundur: belok bawah dulu, lalu ke target
                    `M ${a.from.x} ${a.from.y} L ${elbowMid} ${a.from.y} L ${elbowMid} ${a.from.y + 10} L ${a.to.x} ${a.from.y + 10} L ${a.to.x} ${a.to.y + 6} L ${a.to.x} ${a.to.y - 4}`;
              const stroke = a.isCritical ? '#ef4444' : '#64748b';
              return (
                <g key={`arrow-${i}`}>
                  <path
                    data-dep-arrow={a.id}
                    d={d}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={a.isCritical ? 2 : 1.2}
                    markerEnd={`url(#gh-${a.isCritical ? 'critical' : 'normal'})`}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Legenda */}
      <div
        style={{
          padding: '0.75rem 1rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          borderTop: '1px solid var(--gray-200)',
          background: 'var(--gray-50)',
        }}
      >
        <span style={{ fontSize: '0.8125rem', color: '#b91c1c' }}>■ Jalur Kritis</span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>■ Batang Tugas</span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>▼ Batang Ringkasan (Induk)</span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>▮ Akhir Pekan (libur)</span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>▮ Hari Libur Custom</span>
      </div>
    </div>
  );
};

export default GanttChart;
