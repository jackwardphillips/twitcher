import { getRarityCode } from '../lib/rarity-service';

async function main() {
  const birdsToTest = [
    'Black-bellied Whistling-Duck',
    'Emperor Goose',
    'Graylag Goose',
    'Labrador Duck (extinct, 1858)',
    'Non-existent Bird',
  ];

  console.log('Testing Rarity Service Lookup:');
  for (const bird of birdsToTest) {
    const rarity = await getRarityCode(bird);
    console.log(`- ${bird}: ${rarity === null ? 'Not Found' : `ABA Code ${rarity}`}`);
  }
}

main();
