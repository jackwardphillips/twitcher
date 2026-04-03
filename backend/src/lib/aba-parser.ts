import { readFileSync } from 'fs';
import { join } from 'path';

// Define the structure of a parsed bird entry
interface ABABirdEntry {
  commonName: string;
  scientificName: string;
  abaCode: number | null;
}

export function parseABAChecklist(csvContent: string): ABABirdEntry[] {
  const lines = csvContent.split('
');
  const parsedBirds: ABABirdEntry[] = [];

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) {
      continue;
    }

    const fields = line.split(',');

    // Heuristics to skip header rows and family group lines:
    // 1. Lines starting with "Version", "Note" are headers.
    // 2. Lines with fewer than 5 fields are likely malformed or incomplete.
    // 3. Lines where the first field is not empty and looks like a family group are headers.
    // 4. Lines where the common name (field 1) is empty after splitting are likely not species data.
    if (
      line.startsWith('"Version') ||
      line.startsWith('"Note') ||
      fields.length < 5 || // Minimum fields for a species entry: Family,,,,Species,Common Name,Scientific Name,Alpha Code,ABA Code -> needs at least 6 parts if Family is empty
      fields[0].startsWith('"') && fields[0].includes('(') && fields[0].includes(')') || // Detects family group names like "Ducks, Geese, and Swans (Anatidae)"
      fields[1]?.trim() === '' // Ensure common name field is not empty
    ) {
      continue;
    }

    // Ensure we have enough fields for the data we need
    if (fields.length < 6) {
        continue; // Not enough fields for species, scientific name, and ABA code
    }

    const commonName = fields[1]?.trim();
    const scientificName = fields[3]?.trim();
    const abaCodeString = fields[5]?.trim();

    // Basic validation: commonName and scientificName should not be empty for a valid entry
    if (!commonName || !scientificName) {
        continue;
    }

    let abaCode: number | null = null;
    if (abaCodeString) {
      const parsedCode = parseInt(abaCodeString, 10);
      if (!isNaN(parsedCode)) {
        abaCode = parsedCode;
      }
    }

    parsedBirds.push({
      commonName,
      scientificName,
      abaCode,
    });
  }

  return parsedBirds;
}
