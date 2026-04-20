import React, { useState } from 'react';

interface DailyCount {
  date: string;
  count: number;
}

interface SightingHistogramProps {
  dailyCounts: DailyCount[];
  rarityColor: string;
}

const SightingHistogram: React.FC<SightingHistogramProps> = ({ dailyCounts, rarityColor }) => {
  const [hovered, setHovered] = useState<DailyCount | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const maxCount = Math.max(...dailyCounts.map(d => d.count), 1);

  const handleMouseMove = (e: React.MouseEvent, d: DailyCount) => {
    setHovered(d);
    // Position relative to the container, not just the bar's offsetX
    const rect = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({ x: e.clientX - rect.left, y: 5 });
    }
  };

  return (
    <div className="sighting-histogram" style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
      <span className="stat-label">Activity</span>
      <div className="histogram-bars" style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '30px', width: '100%' }}>
        {dailyCounts.map((d, i) => (
          <div
          key={i}
          data-testid="histogram-bar"
          style={{
            flex: 1,
            height: d.count === 0 ? '0.75px' : `${(d.count / maxCount) * 100}%`,
            backgroundColor: d.count > 0 ? `${rarityColor}D9` : '#ccc',
            border: 'none',
            borderRadius: d.count === 0 ? '0' : '2px 2px 0 0'
          }}
          onMouseEnter={() => setHovered(d)}
          onMouseMove={(e) => handleMouseMove(e, d)}
          onMouseLeave={() => setHovered(null)}
          />
        ))}
      </div>
      {hovered && (
        <div data-testid="histogram-tooltip" style={{ position: 'absolute', left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px`, background: '#333', color: '#fff', padding: '2px 5px', borderRadius: '4px', fontSize: '10px', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          {new Date(hovered.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}: {hovered.count} {hovered.count === 1 ? 'sighting' : 'sightings'}
        </div>
      )}
    </div>
  );
};

export { SightingHistogram };
