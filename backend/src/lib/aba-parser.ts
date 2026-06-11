import { parse } from 'csv-parse/sync';

// Define the structure of a parsed bird entry
interface ABABirdEntry {
  commonName: string;
  scientificName: string;
  abaCode: number | null;
}

export function parseABAChecklist(csvContent: string): ABABirdEntry[] {
  // Use csv-parse library as instructed.
  // We explicitly name the columns to match the test expectations and potential CSV structure.
  // relax_column_count: true allows for rows with varying field counts.
  // skip_lines is used to bypass the initial metadata lines in the CSV.
  const records = parse(csvContent, {
    columns: [
      'family',
      'commonName',
      'frenchCommonName',
      'scientificName',
      'alphaCode',
      'abaCode'
    ],
    skip_empty_lines: true,
    trim: true,
    from_line: 4, // Skip the initial 3 metadata lines.
    relax_column_count: true // Allow rows with different numbers of columns.
  }) as any[];

  const parsedBirds: ABABirdEntry[] = [];

  for (const record of records) {
    // Filter out non-species lines.
    // A species line should have a common name and scientific name.
    // 'record' object keys are from the 'columns' array.
    if (!record.commonName || !record.scientificName) {
      continue;
    }

    // The 'family' field might be populated for family group lines if they are not skipped by 'skip_lines'.
    // We only want species data. Heuristic: if commonName is empty or looks like a family name, skip.
    // However, the primary check of commonName and scientificName should suffice if species lines are consistent.
    // The test data includes family lines without a leading comma, which might be parsed if not skipped properly.
    // For now, rely on commonName and scientificName being present for species data.

    let abaCode: number | null = null;
    // Check if abaCode exists and is not an empty string before parsing
    if (record.abaCode && record.abaCode.trim() !== '') {
      const parsedCode = parseInt(record.abaCode, 10);
      if (!isNaN(parsedCode)) {
        abaCode = parsedCode;
      }
    }

    parsedBirds.push({
      commonName: record.commonName,
      scientificName: record.scientificName,
      abaCode,
    });
  }

  return parsedBirds;
}
