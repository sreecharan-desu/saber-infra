import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('🧹 Starting database cleanup...\n');

  try {
    // Delete in reverse order of dependencies to avoid foreign key constraints
    console.log('Deleting Messages...');
    await prisma.message.deleteMany({});
    
    console.log('Deleting Matches...');
    await prisma.match.deleteMany({});
    
    console.log('Deleting Swipes...');
    await prisma.swipe.deleteMany({});
    
    console.log('Deleting Jobs...');
    await prisma.job.deleteMany({});
    
    console.log('Deleting Companies...');
    await prisma.company.deleteMany({});
    
    console.log('Deleting Skills...');
    await prisma.skill.deleteMany({});
    
    console.log('Deleting Recommendation Profiles...');
    await prisma.recommendationProfile.deleteMany({});
    
    console.log('Deleting OAuth Accounts...');
    await prisma.oAuthAccount.deleteMany({});
    
    console.log('Deleting Users...');
    await prisma.user.deleteMany({});

    console.log('\n✅ Database cleaned successfully!');
    console.log('All tables have been emptied.\n');
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
