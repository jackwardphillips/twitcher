const ALLOWED_LICENSES = new Set(['cc0', 'cc-by']);

export const INAT_PHOTO_LICENSE_FILTER = 'CC0,CC-BY';

interface PhotoPolicyInput {
  licenseCode: string | null | undefined;
  photoUrl: string | null | undefined;
  sourceUrl: string | null | undefined;
}

export const isAllowedINaturalistPhoto = ({
  licenseCode,
  photoUrl,
  sourceUrl,
}: PhotoPolicyInput): boolean => {
  if (!licenseCode || !photoUrl || !sourceUrl) return false;
  if (!ALLOWED_LICENSES.has(licenseCode.toLowerCase())) return false;

  try {
    const photo = new URL(photoUrl);
    const source = new URL(sourceUrl);

    return (
      photo.protocol === 'https:' &&
      photo.hostname === 'inaturalist-open-data.s3.amazonaws.com' &&
      source.protocol === 'https:' &&
      source.hostname === 'www.inaturalist.org' &&
      /^\/observations\/\d+$/.test(source.pathname)
    );
  } catch {
    return false;
  }
};
