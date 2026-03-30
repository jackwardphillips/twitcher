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

export function parseEBirdAlert(content: string): Sighting[] {
  const sightings: Sighting[] = [];
  const lines = content.split('\n').map(line => line.trim());
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line) {
      i++;
      continue;
    }

    // Match species line: Species Name (Scientific Name) (Count) [CONFIRMED]
    // Note: Scientific Name might have spaces or groups, e.g., (Anser fabalis)
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
