import React, { useRef, useState } from 'react';
import { formatDayMonth } from '../lib/date-utils.js';

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
  const [tooltipAnchor, setTooltipAnchor] = useState<'left' | 'center' | 'right'>('center');
  const containerRef = useRef<HTMLDivElement | null>(null);

  const maxCount = Math.max(...dailyCounts.map(d => d.count), 1);

  const handleMouseMove = (e: React.MouseEvent, d: DailyCount) => {
    setHovered(d);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const relativeX = e.clientX - rect.left;
      const tooltipWidthEstimate = 170;
      const padding = 10;

      if (relativeX < tooltipWidthEstimate / 2 + padding) {
        setTooltipAnchor('left');
      } else if (relativeX > rect.width - (tooltipWidthEstimate / 2 + padding)) {
        setTooltipAnchor('right');
      } else {
        setTooltipAnchor('center');
      }
    }
  };

  return (
    <div ref={containerRef} className="sighting-histogram" style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
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
            borderRadius: (d.count / maxCount) * 100 > 15 ? '2px 2px 0 0' : '0'
          }}

          onMouseEnter={() => setHovered(d)}
          onMouseMove={(e) => handleMouseMove(e, d)}
          onMouseLeave={() => setHovered(null)}
          />
        ))}
      </div>
      {hovered && (
        <div 
          data-testid="histogram-tooltip" 
          style={{ 
            position: 'absolute', 
            insetInline: 0,
            top: '5px',
            zIndex: 20,
            display: 'flex',
            justifyContent: tooltipAnchor === 'left' ? 'flex-start' : tooltipAnchor === 'right' ? 'flex-end' : 'center',
            paddingInline: '4px',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              maxWidth: 'calc(100% - 8px)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              whiteSpace: 'nowrap',
              background: 'rgba(253, 248, 240, 0.75)',
              color: '#6b5a3e',
              pointerEvents: 'none',
              boxShadow: '2px 2px 5px rgba(44, 36, 22, 0.1)'
            }}
          >
            {formatDayMonth(hovered.date)}: {hovered.count} {hovered.count === 1 ? 'sighting' : 'sightings'}
          </span>
        </div>
      )}
    </div>
  );
};

export { SightingHistogram };
