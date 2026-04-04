import { prisma } from '../lib/db';

async function main() {
  const count = await prisma.rarityCode.count();
  console.log(`Total rarity codes in database: ${count}`);

  const samples = await prisma.rarityCode.findMany({
    take: 5,
  });
  console.log('Sample rarity codes:', JSON.stringify(samples, null, 2));
}

main();
