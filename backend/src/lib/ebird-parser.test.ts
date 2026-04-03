import { describe, it, expect } from 'vitest';
import { parseEBirdAlert } from './ebird-parser';

const sampleEmail = `
Taiga Bean-Goose (Anser fabalis) (2) CONFIRMED
- Reported Mar 29, 2026 17:00 by Alexander Dabbs
- Deering Rd, Capital CA-BC 48.58130, -124.39482, Capital, British Columbia
- Map: http://maps.google.com/?ie=UTF8&t=p&z=13&q=48.581296,-124.394823&ll=48.581296,-124.394823
- Checklist: https://ebird.org/checklist/S314590424
- Comments: "West of Deering rd bridge. Photos ofc."

Pink-footed Goose (Anser brachyrhynchus) (1)
- Reported Mar 29, 2026 16:50 by Tucker Frank
- 219=E2=80=93277 Newport Rd, Corinna US-ME (44.9071,-69.2646), Penobscot, Maine
- Map: http://maps.google.com/?ie=UTF8&t=p&z=13&q=44.90708,-69.264574&ll=44.90708,-69.264574
- Checklist: https://ebird.org/checklist/S314522698
- Comments: "Continuing bird seen in the field off the western side of the road."
`;

describe('eBird Parser', () => {
  it('should parse bird sightings from email content', () => {
    const sightings = parseEBirdAlert(sampleEmail);
    
    expect(sightings).toHaveLength(2);
    
    expect(sightings[0]).toMatchObject({
      species: 'Taiga Bean-Goose',
      scientificName: 'Anser fabalis',
      count: 2,
      confirmed: true,
      observer: 'Alexander Dabbs',
      location: 'Deering Rd, Capital CA-BC 48.58130, -124.39482, Capital, British Columbia',
      date: new Date('Mar 29, 2026 17:00'),
    });

    expect(sightings[1]).toMatchObject({
      species: 'Pink-footed Goose',
      scientificName: 'Anser brachyrhynchus',
      count: 1,
      confirmed: false,
      observer: 'Tucker Frank',
      location: '219–277 Newport Rd, Corinna US-ME (44.9071,-69.2646), Penobscot, Maine',
      date: new Date('Mar 29, 2026 16:50'),
    });
  });

  it('should parse complex sightings with media and multiple comments', () => {
    const complexSample = `
Pink-footed Goose (Anser brachyrhynchus) (1) CONFIRMED
- Reported Mar 28, 2026 16:06 by Lauren diBiccari
- Nokomis Rd fields, Corinna (roadside access only), Penobscot, Maine
- Map: http://maps.google.com/?ie=UTF8&t=p&z=13&q=44.912888,-69.279242&ll=44.912888,-69.279242
- Checklist: https://ebird.org/checklist/S314347827
- Media: 13 Photos
- Comments: "Continuing - just as we arrived it flew a lap overhead with some Canadas then landed out of view to SE of the road, down over the hill. A few minutes later it flew back over and landed fairly close to the road, on the N side. Originally found March 26 by Ruth Fogler. Photos."
`;
    const sightings = parseEBirdAlert(complexSample);
    expect(sightings).toHaveLength(1);
    expect(sightings[0]).toMatchObject({
      species: 'Pink-footed Goose',
      confirmed: true,
      observer: 'Lauren diBiccari',
      location: 'Nokomis Rd fields, Corinna (roadside access only), Penobscot, Maine',
      comments: 'Continuing - just as we arrived it flew a lap overhead with some Canadas then landed out of view to SE of the road, down over the hill. A few minutes later it flew back over and landed fairly close to the road, on the N side. Originally found March 26 by Ruth Fogler. Photos.',
    });
  });
});
