import { prisma } from '../lib/db.js';

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
    const rarityRecord = await prisma.rarityCode.findFirst({
      where: {
        OR: [
          { commonName: bird },
          { scientificName: bird },
        ],
      },
    });
    const rarity = rarityRecord?.abaCode ?? null;
    console.log(`- ${bird}: ${rarity === null ? 'Not Found' : `ABA Code ${rarity}`}`);
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
