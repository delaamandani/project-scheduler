import { FC, useMemo, useRef, useState } from 'react';
import { Task, Dependency } from '../types';

interface Props {
  tasks: Task[];
  dependencies: Dependency[];
}

const NODE_WIDTH = 100;
const NODE_HEIGHT = 50;
const MIN_HORIZONTAL_GAP = 40;
const MIN_VERTICAL_GAP = 60;

interface NodePosition {
  x: number;
  y: number;
}

const PERTDiagram: FC<Props> = ({ tasks, dependencies }) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const nodePositions = useMemo(() => {
    const hasPredecessor = new Set<string>();
    const successors = new Map<string, string[]>();

    for (const dep of dependencies) {
      hasPredecessor.add(dep.successorId);
      const list = successors.get(dep.predecessorId) ?? [];
      list.push(dep.successorId);
      successors.set(dep.predecessorId, list);
    }

    const startNodes = tasks.filter((t) => !hasPredecessor.has(t.id));
    const layers: string[][] = [];
    const assigned = new Set<string>();

    let currentLayer: string[] = startNodes.map((t) => t.id);
    while (currentLayer.length > 0) {
      layers.push(currentLayer);
      const nextLayer: string[] = [];
      for (const id of currentLayer) {
        for (const succ of successors.get(id) ?? []) {
          if (!assigned.has(succ)) {
            nextLayer.push(succ);
            assigned.add(succ);
          }
        }
      }
      currentLayer = nextLayer;
    }

    const positions = new Map<string, NodePosition>();

    for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
      const layer = layers[layerIdx];
      const count = layer.length;

      for (let i = 0; i < count; i++) {
        const id = layer[i];
        const x = 50 + i * (NODE_WIDTH + MIN_HORIZONTAL_GAP) + NODE_WIDTH / 2;
        const y = 50 + layerIdx * (NODE_HEIGHT + MIN_VERTICAL_GAP) + NODE_HEIGHT / 2;
        positions.set(id, { x, y });
      }
    }

    const totalHeight = Math.max(
      tasks.length * (NODE_HEIGHT + MIN_VERTICAL_GAP),
      200
    ) + 50;
    const totalWidth = Math.max(400, 50 + layers.length * (NODE_HEIGHT + MIN_VERTICAL_GAP) + 50);

    return { positions, totalWidth, totalHeight };
  }, [tasks, dependencies]);

  const getSuccessors = (id: string) => {
    return dependencies.filter((d) => d.predecessorId === id).map((d) => d.successorId);
  };

  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const criticalPathIds = useMemo(() => {
    if (tasks.length === 0) return new Set<string>();

    let maxDuration = 0;
    let longestPath: string[] = [];

    const hasPredecessor = new Set(dependencies.map((d) => d.successorId));
    const startNodes = tasks.filter((t) => !hasPredecessor.has(t.id));

    function dfs(id: string, path: string[], duration: number) {
      const task = taskMap.get(id);
      if (!task) return;

      const newPath = [...path, id];
      const newDuration = duration + task.durationDays;

      const succs = getSuccessors(id);
      if (succs.length === 0) {
        if (newDuration > maxDuration) {
          maxDuration = newDuration;
          longestPath = newPath;
        }
        return;
      }

      for (const succ of succs) {
        dfs(succ, newPath, newDuration);
      }
    }

    for (const start of startNodes) {
      dfs(start.id, [], 0);
    }

    return new Set(longestPath);
  }, [tasks, dependencies, taskMap]);

  const drawArrow = (
    from: NodePosition,
    to: NodePosition,
    depType: string,
    delay: number,
    isCritical: boolean
  ) => {
    const fromX = from.x;
    const fromY = from.y;
    const toX = to.x;
    const toY = to.y;

    const midX = (fromX + toX) / 2;
    const controlOffset = Math.abs(toX - fromX) * 0.3;

    let pathD: string;
    let labelX: number;
    let labelY: number;

    if (Math.abs(toY - fromY) < 10) {
      pathD = `M ${fromX} ${fromY} L ${toX - 30} ${fromY} L ${toX} ${toY}`;
      labelX = (fromX + toX) / 2;
      labelY = fromY - 12;
    } else {
      pathD = `M ${fromX} ${fromY} C ${fromX} ${fromY + controlOffset}, ${toX} ${toY - controlOffset}, ${toX} ${toY}`;
      labelX = midX;
      labelY = (fromY + toY) / 2 - 10;
    }

    return (
      <g key={`arrow-${fromX}-${toX}-${fromY}-${toY}`}>
        <path
          d={pathD}
          fill="none"
          stroke={isCritical ? '#ef4444' : '#64748b'}
          strokeWidth={isCritical ? 2 : 1.5}
          markerEnd={`url(#arrowhead-${isCritical ? 'critical' : 'normal'})`}
        />
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect
            x={-20}
            y={-10}
            width={40}
            height={16}
            rx={2}
            fill={isCritical ? '#fef2f2' : '#f8fafc'}
            stroke={isCritical ? '#fecaca' : '#e2e8f0'}
          />
          <text
            x={0}
            y={3}
            textAnchor="middle"
            fontSize="9"
            fill={isCritical ? '#ef4444' : '#64748b'}
            fontWeight="600"
          >
            {depType}
            {delay !== 0 && ` +${delay}`}
          </text>
        </g>
      </g>
    );
  };

  if (tasks.length === 0) {
    return (
      <div className="pert-container">
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <h3>Belum ada tugas</h3>
          <p>Tambahkan tugas dan dependensi untuk melihat diagram PERT.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pert-container">
      <div className="gantt-toolbar">
        <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
          Diagram jaringan (PERT) - {tasks.length} aktivitas
        </div>
        <div style={{ flex: 1 }} />
        <small style={{ color: 'var(--gray-500)' }}>
          Hover pada node untuk melihat detail
        </small>
      </div>

      <div style={{ overflow: 'auto', maxHeight: '600px' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${nodePositions.totalWidth} ${nodePositions.totalHeight}`}
        className="pert-svg"
        style={{ minWidth: '100%', background: 'white' }}
      >
        <defs>
          <marker
            id="arrowhead-normal"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
          </marker>
          <marker
            id="arrowhead-critical"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
          </marker>
        </defs>

        {dependencies.map((dep) => {
          const from = nodePositions.positions.get(dep.predecessorId)!;
          const to = nodePositions.positions.get(dep.successorId)!;
          if (!from || !to) return null;

          return drawArrow(
            from,
            to,
            dep.type,
            dep.delayDays,
            criticalPathIds.has(dep.predecessorId) && criticalPathIds.has(dep.successorId)
          );
        })}

        {tasks.map((task) => {
          const pos = nodePositions.positions.get(task.id);
          if (!pos) return null;

          const isCritical = criticalPathIds.has(task.id);
          const isHovered = hoveredNode === task.id;

          return (
            <g
              key={task.id}
              transform={`translate(${pos.x - NODE_WIDTH / 2}, ${pos.y - NODE_HEIGHT / 2})`}
              onMouseEnter={() => setHoveredNode(task.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={8}
                fill={isCritical ? '#fef2f2' : isHovered ? '#f0f0ff' : 'white'}
                stroke={task.color}
                strokeWidth={isCritical ? 3 : 2}
              />

              <rect
                x={0}
                y={0}
                width={NODE_WIDTH}
                height={4}
                rx={2}
                fill={task.color}
              />

              <text
                x={NODE_WIDTH / 2}
                y={22}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#1e293b"
              >
                {task.name}
              </text>

              <text
                x={NODE_WIDTH / 2}
                y={36}
                textAnchor="middle"
                fontSize="10"
                fill={task.color}
              >
                {task.durationDays} hari kerja
              </text>

              {isCritical && (
                <g transform={`translate(${NODE_WIDTH - 14}, 6)`}>
                  <rect width={12} height={12} rx={2} fill="#ef4444" />
                  <text x={6} y={10} textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">
                    !
                  </text>
                </g>
              )}

              {isHovered && (
                <g transform={`translate(${NODE_WIDTH + 10}, -10)`}>
                  <rect
                    width={180}
                    height={isCritical ? 80 : 60}
                    rx={4}
                    fill="white"
                    stroke="#e2e8f0"
                  />
                  <text x={8} y={18} fontSize="10" fontWeight="600" fill="#1e293b">
                    {task.name}
                  </text>
                  <text x={8} y={30} fontSize="9" fill="#64748b">
                    Durasi: {task.durationDays} hari kerja
                  </text>
                  {task.startDate && (
                    <text x={8} y={42} fontSize="9" fill="#64748b">
                      Mulai: {task.startDate}
                    </text>
                  )}
                  {task.endDate && (
                    <text x={8} y={52} fontSize="9" fill="#64748b">
                      Selesai: {task.endDate}
                    </text>
                  )}
                  {isCritical && (
                    <text x={8} y={isCritical ? 72 : 62} fontSize="9" fill="#ef4444" fontWeight="bold">
                      ** Jalur Kritis **
                    </text>
                  )}
                </g>
              )}
            </g>
          );
        })}

        <g transform={`translate(10, ${nodePositions.totalHeight - 40})`}>
          <rect width={200} height={30} rx={4} fill="white" stroke="#e2e8f0" />
          <circle cx={16} cy={12} r={4} fill="#ef4444" />
          <text x={26} y={16} fontSize="9" fill="#64748b">
            Jalur Kritis
          </text>
          <circle cx={80} cy={12} r={4} fill={tasks[0]?.color || '#6366f1'} />
          <text x={90} y={16} fontSize="9" fill="#64748b">
            Tugas
          </text>
        </g>
      </svg>
      </div>

      <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef2f2', borderRadius: 'var(--radius)', border: '1px solid #fecaca' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#b91c1c', marginBottom: '0.25rem' }}>
          Jalur Kritis
        </div>
        <div style={{ fontSize: '0.8125rem', color: '#92400e' }}>
          {criticalPathIds.size > 0
            ? `Aktifitas: ${Array.from(criticalPathIds).map((id) => taskMap.get(id)?.name || id).join(' → ')}`
            : 'Belum dapat dihitung'}
          {criticalPathIds.size > 0 && taskMap.get(Array.from(criticalPathIds)[0]) && (
            <> → Total: {Array.from(criticalPathIds).reduce((sum, id) => sum + (taskMap.get(id)?.durationDays || 0), 0)} hari</>
          )}
        </div>
      </div>
    </div>
  );
};

export default PERTDiagram;
