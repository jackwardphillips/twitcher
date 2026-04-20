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

  const maxCount = Math.max(...dailyCounts.map(d => d.count), 1);

  return (
    <div className="sighting-histogram" style={{ position: 'relative', width: '100%' }}>
      <div className="histogram-bars" style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '30px' }}>
        {dailyCounts.map((d, i) => (
          <div
            key={i}
            data-testid="histogram-bar"
            style={{
              flex: 1,
              height: `${(d.count / maxCount) * 100}%`,
              backgroundColor: d.count > 0 ? rarityColor : 'transparent',
              border: d.count === 0 ? '1px dashed #ccc' : 'none'
            }}
            onMouseEnter={() => setHovered(d)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </div>
      {hovered && (
        <div data-testid="histogram-tooltip" style={{ position: 'absolute', top: '-25px', background: '#333', color: '#fff', padding: '2px 5px', borderRadius: '4px', fontSize: '10px', whiteSpace: 'nowrap' }}>
          {new Date(hovered.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}: {hovered.count}
        </div>
      )}
    </div>
  );
};

export { SightingHistogram };
