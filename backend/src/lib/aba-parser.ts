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
    // Adjust skip_lines based on analysis: skip metadata (3 lines) + family header (1 line)
    // to start parsing from the first species data line.
    skip_lines: 4
  });

  const parsedBirds: ABABirdEntry[] = [];

  for (const record of records) {
    // Filter out non-species lines (like family group headers or empty lines after parsing).
    // A species line should have a common name and scientific name.
    // The 'record' object will have keys as defined in the 'columns' array above.
    // We need to check if the parsed record is a valid species entry.
    // 'commonName' and 'scientificName' are essential.
    if (!record.commonName || !record.scientificName) {
      continue;
    }

    // Some lines might be family headers even after skipping, check if commonName is a known family name or if the first field (family) is meaningful.
    // However, the current heuristic relies on commonName and scientificName being present.

    let abaCode: number | null = null;
    if (record.abaCode) {
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
