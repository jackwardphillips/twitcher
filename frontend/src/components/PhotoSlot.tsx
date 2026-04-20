import React from 'react';

interface PhotoSlotProps {
  photo: { url: string; attribution: string } | null;
}

const PhotoSlot: React.FC<PhotoSlotProps> = ({ photo }) => {
  return (
    <div className="photo-slot" data-testid="photo-slot">
      {photo ? (
        <>
          <img src={photo.url} alt="Sighting photo" />
          <div className="attribution-overlay">{photo.attribution}</div>
        </>
      ) : (
        <div className="photo-placeholder" />
      )}
    </div>
  );
};

export { PhotoSlot };
