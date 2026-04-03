export interface Sighting {
  species: string;
  scientificName: string;
  count: number;
  confirmed: boolean;
  observer: string;
  location: string;
  date: Date;
  mapUrl?: string;
  checklistUrl?: string;
  comments?: string;
}

/**
 * Decodes quoted-printable encoding and handles soft line breaks.
 */
function decodeQuotedPrintable(text: string): string {
  // 1. Handle soft line breaks: a '=' at the very end of a line means the next line should be joined
  // Note: we use a regex that matches '=' followed by optional whitespace and a newline
  let decoded = text.replace(/=\s*\r?\n/g, '');

  // 2. Decode hex-encoded characters (e.g., =E2=80=93 for en-dash)
  decoded = decoded.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  // 3. Simple fix for common UTF-8 sequences that were hex-encoded then treated as ISO-8859-1
  // This is a common issue with eBird emails where UTF-8 is encoded but not explicitly declared.
  // We'll use a TextDecoder if we wanted to be perfect, but for coordinates and names, 
  // replacing common mangled characters is often enough.
  try {
      // Try to re-interpret as UTF-8 if it looks like it
      const bytes = new Uint8Array(decoded.split('').map(c => c.charCodeAt(0)));
      return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
      return decoded;
  }
}

export function parseEBirdAlert(content: string): Sighting[] {
  // Decode the entire content first
  const decodedContent = decodeQuotedPrintable(content);
  
  const sightings: Sighting[] = [];
  const lines = decodedContent.split(/\r?\n/).map(line => line.trim());
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line) {
      i++;
      continue;
    }

    // Match species line: Species Name (Scientific Name) (Count) [CONFIRMED]
    const speciesMatch = line.match(/^(.+?) \((.+?)\) \((\d+)\)( CONFIRMED)?$/);
    
    if (speciesMatch) {
      const species = speciesMatch[1]!;
      const scientificName = speciesMatch[2]!;
      const count = parseInt(speciesMatch[3]!, 10);
      const confirmed = !!speciesMatch[4];
      
      let observer = '';
      let date: Date = new Date();
      let location = '';
      let mapUrl = '';
      let checklistUrl = '';
      let comments = '';

      i++;
      // Parse details starting with '-'
      while (i < lines.length && lines[i]?.startsWith('-')) {
        const detailLine = lines[i]!;
        
        if (detailLine.startsWith('- Reported ')) {
          const reportedMatch = detailLine.match(/- Reported (.+?) by (.+)$/);
          if (reportedMatch) {
            date = new Date(reportedMatch[1]!);
            observer = reportedMatch[2]!;
          }
        } else if (detailLine.startsWith('- Map: ')) {
          mapUrl = detailLine.substring(7).trim();
        } else if (detailLine.startsWith('- Checklist: ')) {
          checklistUrl = detailLine.substring(13).trim();
        } else if (detailLine.startsWith('- Comments: ')) {
          comments = detailLine.substring(12).replace(/^"|"$/g, '').trim();
        } else if (detailLine.startsWith('- Media: ')) {
          // Skip media for now
        } else {
          // Assume it's the location line if it doesn't match other prefixes
          location = detailLine.substring(2).trim();
        }
        i++;
      }

      sightings.push({
        species,
        scientificName,
        count,
        confirmed,
        observer,
        location,
        date,
        mapUrl,
        checklistUrl,
        comments
      });
    } else {
      i++;
    }
  }

  return sightings;
}
