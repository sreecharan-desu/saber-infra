import { UserRole, SwipeDirection, ApplicationStatus } from "@prisma/client";
import { faker } from "@faker-js/faker";
import dotenv from "dotenv";
import prisma from "../src/config/prisma";
// Now using encrypted Prisma client - all data will be automatically encrypted!

dotenv.config();

async function main() {
  console.log("🌱 Seeding Recruiter Analytics Data...");

  // 1. Get or Create SPECIFIC Recruiter
  const targetEmail = "alaharibhanuprakash.04@gmail.com";
  console.log(`Targeting Recruiter: ${targetEmail}`);

  let recruiter = await prisma.user.findUnique({
    where: { email: targetEmail },
  });

  if (!recruiter) {
    console.log("Recruiter not found, creating...");
    recruiter = await prisma.user.create({
      data: {
        role: UserRole.recruiter,
        name: "Bhanu Prakash",
        email: targetEmail,
        created_at: new Date(),
      },
    });
  } else if (recruiter.role !== UserRole.recruiter) {
    console.log(
      `User exists but is ${recruiter.role}. Promoting to recruiter...`,
    );
    recruiter = await prisma.user.update({
      where: { id: recruiter.id },
      data: { role: UserRole.recruiter },
    });
  }

  console.log(`Using Recruiter ID: ${recruiter.id}`);

  // 2. Ensure Recruiter has a Company
  let company = await prisma.company.findFirst({
    where: { recruiter_id: recruiter.id },
  });

  if (!company) {
    console.log("Creating company for recruiter...");
    company = await prisma.company.create({
      data: {
        name: faker.company.name(),
        recruiter_id: recruiter.id,
        verified: true,
      },
    });
  }

  // 3. Cleanup Existing Data for this Recruiter (Idempontency)
  console.log("Cleaning up existing jobs/interactions for this recruiter...");
  const existingJobIds = (
    await prisma.job.findMany({
      where: { company_id: company.id },
      select: { id: true },
    })
  ).map((j) => j.id);

  if (existingJobIds.length > 0) {
    await prisma.match.deleteMany({
      where: { job_id: { in: existingJobIds } },
    });
    await prisma.application.deleteMany({
      where: { job_id: { in: existingJobIds } },
    });
    await prisma.swipe.deleteMany({
      where: { job_id: { in: existingJobIds } },
    });
    await prisma.job.deleteMany({ where: { id: { in: existingJobIds } } });
  }

  // 4. Create active jobs (Target 20)
  console.log(`Creating 20 fresh jobs...`);
  const jobsData = [];
  for (let i = 0; i < 20; i++) {
    jobsData.push({
      company_id: company.id,
      problem_statement: faker.hacker.phrase(),
      expectations: faker.lorem.paragraph(),
      non_negotiables: faker.lorem.sentence(),
      deal_breakers: faker.lorem.sentence(),
      skills_required: [faker.hacker.noun(), faker.hacker.noun()],
      constraints_json: {},
      active: true,
    });
  }
  await prisma.job.createMany({ data: jobsData });
  const myJobs = await prisma.job.findMany({
    where: { company_id: company.id },
  });

  // 5. Create/Get Candidates (Target 300)
  const candidateCount = await prisma.user.count({
    where: { role: UserRole.candidate },
  });
  if (candidateCount < 300) {
    console.log("Seeding massive candidate pool...");
    const needed = 300 - candidateCount;
    for (let i = 0; i < needed; i++) {
      await prisma.user.create({
        data: {
          role: UserRole.candidate,
          name: faker.person.fullName(),
          email: faker.internet.email(),
          intent_text: faker.lorem.sentence(),
          skills: {
            create: [
              { name: "React", source: "manual", confidence_score: 1.0 },
            ],
          },
        },
      });
    }
  }
  const candidates = await prisma.user.findMany({
    where: { role: UserRole.candidate },
    take: 300,
  });

  // 6. Generate Interactions using createMany
  console.log("Generating interactions (Batch Processing)...");
  let viewsAdded = 0;
  let appsAdded = 0;
  let matchesAdded = 0;

  for (const job of myJobs) {
    const viewers = faker.helpers.arrayElements(
      candidates,
      faker.number.int({ min: 50, max: 150 }),
    );
    const swipes = [];
    const apps = [];
    const matches = [];

    for (const candidate of viewers) {
      const direction = faker.helpers.arrayElement([
        SwipeDirection.left,
        SwipeDirection.right,
      ]);
      swipes.push({ user_id: candidate.id, job_id: job.id, direction });

      if (direction === SwipeDirection.right) {
        const r = Math.random();
        let status: ApplicationStatus = ApplicationStatus.pending;
        if (r > 0.6) status = ApplicationStatus.reviewing;
        if (r > 0.8) status = ApplicationStatus.interview;
        if (r > 0.95) status = ApplicationStatus.accepted;

        apps.push({
          user_id: candidate.id,
          job_id: job.id,
          status,
          cover_note: faker.lorem.sentence(),
          created_at: faker.date.recent({ days: 90 }),
        });

        if (["interview", "accepted", "reviewing"].includes(status)) {
          matches.push({
            candidate_id: candidate.id,
            job_id: job.id,
            reveal_status: true,
            explainability_json: { score: 0.85 },
          });
        }
      }
    }

    await prisma.swipe.createMany({ data: swipes, skipDuplicates: true });
    await prisma.application.createMany({ data: apps, skipDuplicates: true });
    await prisma.match.createMany({ data: matches, skipDuplicates: true });

    viewsAdded += swipes.length;
    appsAdded += apps.length;
    matchesAdded += matches.length;
    console.log(`- Job ${job.id}: ${swipes.length} views, ${apps.length} apps`);
  }

  console.log(`✅ Analytics Seed Complete for ${targetEmail}`);
  console.log(
    `   - Views: ${viewsAdded} | Apps: ${appsAdded} | Matches: ${matchesAdded}`,
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
