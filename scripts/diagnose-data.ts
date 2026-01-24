import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const targetEmail = "alaharibhanuprakash.04@gmail.com";

  console.log(`🔍 Diagnosing data for: ${targetEmail}`);

  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
    include: { companies: true },
  });

  if (!user) {
    console.error("❌ User not found!");
    return;
  }

  console.log(`✅ User Found: ${user.id} (${user.role})`);

  // Check Jobs
  const jobs = await prisma.job.findMany({
    where: { company: { recruiter_id: user.id } },
  });
  console.log(`📊 Active Jobs: ${jobs.length}`);
  const jobIds = jobs.map((j) => j.id);

  // Check Applications
  const apps = await prisma.application.count({
    where: { job_id: { in: jobIds } },
  });
  console.log(`📄 Applications: ${apps}`);

  // Check Swipes (Views)
  const views = await prisma.swipe.count({
    where: { job_id: { in: jobIds } },
  });
  console.log(`👀 Views (Swipes): ${views}`);

  // Check Matches
  const matches = await prisma.match.count({
    where: { job_id: { in: jobIds } },
  });
  console.log(`🤝 Matches: ${matches}`);

  console.log("-------------------------------------------------");
  console.log("If these numbers are non-zero, the Database has data.");
  console.log("If the API returns old data, it is definitely Caching.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
