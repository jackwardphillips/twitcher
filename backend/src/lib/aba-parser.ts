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
  // skip_lines is used to bypass the initial metadata lines in the CSV.
  const records = parse(csvContent, {
    columns: [
      'family', // Added to account for the 6th field
      'commonName',
      'frenchCommonName',
      'scientificName',
      'alphaCode',
      'abaCode'
    ],
    skip_empty_lines: true,
    trim: true,
    skip_lines: 3 // Skip the initial metadata lines in the CSV file.
  });

  const parsedBirds: ABABirdEntry[] = [];

  for (const record of records) {
    // Filter out non-species lines (like family group headers or empty lines after parsing).
    // A species line should have a common name and scientific name.
    // The 'record' object will have keys as defined in the 'columns' array above.
    if (!record.commonName || !record.scientificName) {
      continue;
    }

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
