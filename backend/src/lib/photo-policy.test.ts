import { describe, expect, it } from 'vitest';
import {
  INAT_PHOTO_LICENSE_FILTER,
  isAllowedINaturalistPhoto,
} from './photo-policy.js';

const validPhoto = {
  photoUrl: 'https://inaturalist-open-data.s3.amazonaws.com/photos/123/square.jpg',
  sourceUrl: 'https://www.inaturalist.org/observations/456',
};

describe('iNaturalist photo policy', () => {
  it('requests only the licenses Twitcher permits', () => {
    expect(INAT_PHOTO_LICENSE_FILTER).toBe('CC0,CC-BY');
  });

  it.each(['cc0', 'cc-by', 'CC0', 'CC-BY'])(
    'accepts the allowed license %s',
    (licenseCode) => {
      expect(isAllowedINaturalistPhoto({ ...validPhoto, licenseCode })).toBe(true);
    },
  );

  it.each([
    null,
    undefined,
    '',
    'cc-by-nc',
    'cc-by-sa',
    'cc-by-nd',
    'cc-by-nc-sa',
    'cc-by-nc-nd',
  ])('rejects the license %s', (licenseCode) => {
    expect(isAllowedINaturalistPhoto({ ...validPhoto, licenseCode })).toBe(false);
  });

  it.each([
    {
      photoUrl: 'https://static.inaturalist.org/photos/123/square.jpg',
      sourceUrl: validPhoto.sourceUrl,
    },
    {
      photoUrl: 'http://inaturalist-open-data.s3.amazonaws.com/photos/123/square.jpg',
      sourceUrl: validPhoto.sourceUrl,
    },
    {
      photoUrl: validPhoto.photoUrl,
      sourceUrl: 'https://example.com/observations/456',
    },
    {
      photoUrl: validPhoto.photoUrl,
      sourceUrl: 'https://www.inaturalist.org/photos/123',
    },
    {
      photoUrl: validPhoto.photoUrl,
      sourceUrl: null,
    },
  ])('rejects unsafe or missing media provenance: %o', (provenance) => {
    expect(
      isAllowedINaturalistPhoto({ ...provenance, licenseCode: 'cc-by' }),
    ).toBe(false);
  });
});
