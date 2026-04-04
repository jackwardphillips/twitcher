import { readFileSync } from 'fs';
import { join } from 'path';

// Define the structure of a parsed bird entry
interface ABABirdEntry {
  commonName: string;
  scientificName: string;
  abaCode: number | null;
}

export function parseABAChecklist(csvContent: string): ABABirdEntry[] {
  // Correctly splitting lines using a regex that handles 
 and 

  const lines = csvContent.split(/?
/);
  const parsedBirds: ABABirdEntry[] = [];

  for (const line of lines) {
    if (!line.trim() || line.startsWith('"Version') || line.startsWith('"Note')) {
      continue;
    }

    // Custom CSV parser logic to handle quoted fields
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        // Check for escaped quote ("")
        if (inQuotes && line[i + 1] === '"') {
          currentField += '"';
          i++; // Skip the next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField); // Add the last field

    // Clean up quotes from fields if they exist and are not escaped quotes
    const cleanedFields = fields.map(field => {
        field = field.trim();
        if (field.startsWith('"') && field.endsWith('"')) {
            return field.substring(1, field.length - 1).replace(/""/g, '"');
        }
        return field;
    });

    let commonName: string | undefined;
    let scientificName: string | undefined;
    let abaCodeString: string | undefined;

    // Heuristic based on observed CSV structure:
    // Case 1: Line starts with a comma (implies empty Family field)
    // Structure: "", CommonName, FrenchCommonName, ScientificName, AlphaCode, ABACode (length 6)
    if (cleanedFields[0] === '' && cleanedFields.length >= 6) {
        commonName = cleanedFields[1];
        scientificName = cleanedFields[3];
        abaCodeString = cleanedFields[5];
    }
    // Case 2: Line starts with a quoted field (implies CommonName is quoted, Family is empty)
    // Structure: QuotedCommonName, FrenchCommonName, ScientificName, AlphaCode, ABACode (length 5)
    else if (cleanedFields.length === 5 && cleanedFields[0].startsWith('"')) {
        commonName = cleanedFields[0];
        scientificName = cleanedFields[2]; // Scientific Name is at index 2 in this 5-field structure
        abaCodeString = cleanedFields[4]; // ABA Code is at index 4 in this 5-field structure
    }
    // Case 3: Potentially a line with a family name followed by species data.
    // Structure: Family, CommonName, FrenchCommonName, ScientificName, AlphaCode, ABACode (length 6+)
    // We can generally assume species data starts from index 1 if family is present.
    // This case might need more specific handling if family names themselves are complex.
    // For now, let's prioritize the two clear cases above and skip others that don't fit.
    else {
        continue; // Skip lines that don't match expected structures
    }

    // Basic validation: commonName and scientificName should not be empty for a valid entry
    if (!commonName?.trim() || !scientificName?.trim()) {
        continue;
    }

    let abaCode: number | null = null;
    if (abaCodeString?.trim()) {
      const parsedCode = parseInt(abaCodeString.trim(), 10);
      if (!isNaN(parsedCode)) {
        abaCode = parsedCode;
      }
    }

    parsedBirds.push({
      commonName: commonName.trim(),
      scientificName: scientificName.trim(),
      abaCode,
    });
  }

  return parsedBirds;
}
