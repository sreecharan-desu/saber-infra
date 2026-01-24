import {
  PrismaClient,
  UserRole,
  SwipeDirection,
  ApplicationStatus,
} from "@prisma/client";
import { faker } from "@faker-js/faker";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

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

  // 3. Create active jobs (Ensure at least 20)
  const existingJobsCount = await prisma.job.count({
    where: { company_id: company.id },
  });
  const targetJobs = 20;
  if (existingJobsCount < targetJobs) {
    console.log(`Creating dummy jobs (current: ${existingJobsCount})...`);
    for (let i = 0; i < targetJobs - existingJobsCount; i++) {
      await prisma.job.create({
        data: {
          company_id: company.id,
          problem_statement: faker.hacker.phrase(),
          expectations: faker.lorem.paragraph(),
          non_negotiables: faker.lorem.sentence(),
          deal_breakers: faker.lorem.sentence(),
          skills_required: [faker.hacker.noun(), faker.hacker.noun()],
          constraints_json: {},
          active: true,
        },
      });
    }
  }

  const myJobs = await prisma.job.findMany({
    where: { company_id: company.id },
  });
  console.log(`Processing ${myJobs.length} jobs for analytics...`);

  // 4. Create/Get Candidates (Target 300)
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

  // Fetch a large pool of candidates
  const candidates = await prisma.user.findMany({
    where: { role: UserRole.candidate },
    take: 300,
  });

  // 5. Generate Interactions (Swipes, Applications, Matches)
  console.log("Generating interactions (Views, Applications, Pipeline)...");

  let viewsAdded = 0;
  let appsAdded = 0;

  for (const job of myJobs) {
    // Randomly select 100-250 candidates per job (High engagement)
    const viewers = faker.helpers.arrayElements(
      candidates,
      faker.number.int({ min: 100, max: 250 }),
    );

    console.log(`Processing Job ${job.id} with ${viewers.length} viewers...`);

    // Use Promise.all for speed
    const promises = viewers.map(async (candidate) => {
      const direction = faker.helpers.arrayElement([
        SwipeDirection.left,
        SwipeDirection.right,
      ]);

      // Create Swipe (View)
      try {
        await prisma.swipe.create({
          data: {
            user_id: candidate.id,
            job_id: job.id,
            direction,
          },
        });
        viewsAdded++;
      } catch (e) {}

      // If Right Swipe -> Application (Funnel)
      if (direction === SwipeDirection.right) {
        // Skewed probability for realism
        const r = Math.random();
        let status: ApplicationStatus = ApplicationStatus.pending;
        if (r > 0.6) status = ApplicationStatus.reviewing;
        if (r > 0.8) status = ApplicationStatus.interview;
        if (r > 0.9) status = ApplicationStatus.rejected;
        if (r > 0.95) status = ApplicationStatus.accepted;

        try {
          await prisma.application.create({
            data: {
              user_id: candidate.id,
              job_id: job.id,
              status: status,
              cover_note: faker.lorem.sentence(),
              created_at: faker.date.recent({ days: 90 }), // Spread over 3 months
            },
          });
          appsAdded++;

          if (["interview", "accepted", "reviewing"].includes(status)) {
            await prisma.match.create({
              data: {
                candidate_id: candidate.id,
                job_id: job.id,
                reveal_status: true,
                explainability_json: {},
              },
            });
          }
        } catch (e) {}
      }
    });

    await Promise.all(promises);
  }

  console.log(`✅ Analytics Seed Complete for ${targetEmail}`);
  console.log(`   - Views (Swipes) Generated: ~${viewsAdded}`);
  console.log(`   - Applications Generated: ~${appsAdded}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
