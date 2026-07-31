import React, { type CSSProperties } from 'react';

interface PhotoSlotProps {
  photo: { url: string; attribution: string; sourceUrl?: string | null } | null;
  imgStyle?: CSSProperties;
}

const PhotoSlot: React.FC<PhotoSlotProps> = ({ photo, imgStyle }) => {
  return (
    <div className="photo-slot" data-testid="photo-slot">
      {photo ? (
        <>
          <img src={photo.url} alt="Sighting photo" style={imgStyle} />
          {photo.sourceUrl ? (
            <a
              className="attribution-overlay"
              href={photo.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              {photo.attribution}
            </a>
          ) : (
            <div className="attribution-overlay">{photo.attribution}</div>
          )}
        </>
      ) : (
        <div className="photo-placeholder" />
      )}
    </div>
  );
};

export { PhotoSlot };
