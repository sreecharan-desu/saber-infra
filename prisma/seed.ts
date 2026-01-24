import { PrismaClient, UserRole, SwipeDirection } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

const TECH_STACKS = [
  "TypeScript",
  "Go",
  "Rust",
  "Java",
  "PostgreSQL",
  "Redis",
  "Kafka",
  "Docker",
  "Kubernetes",
  "AWS",
  "GCP",
  "GraphQL",
  "gRPC",
  "Next.js",
  "React",
  "Terraform",
  "Prometheus",
  "OpenTelemetry",
];

const JOB_TEMPLATES = [
  {
    problem_statement:
      "Design an intent-first matching engine that produces ranked results without revealing candidate or company identity until alignment thresholds are met.",
    expectations:
      "Own the matching pipeline end-to-end. Define data models, scoring logic, and consistency guarantees. Implement low-latency reads with explainable outputs.",
    non_negotiables:
      "Strong backend fundamentals, privacy-by-design thinking, and comfort with ambiguity.",
    deal_breakers:
      "Treating this as a simple CRUD or keyword-matching problem.",
    skills: ["TypeScript", "PostgreSQL", "Redis", "Distributed Systems"],
  },
  {
    problem_statement:
      "Scale an anonymous signal ingestion system to handle bursty writes while preserving ordering, idempotency, and partial consistency.",
    expectations:
      "Design ingestion APIs, enforce data boundaries, and reason about backpressure, retries, and schema evolution.",
    non_negotiables:
      "Clear understanding of write-heavy system design and trade-offs.",
    deal_breakers:
      "Inability to explain consistency or failure handling choices.",
    skills: ["Go", "Kafka", "PostgreSQL", "Kubernetes"],
  },
  {
    problem_statement:
      "Build a real-time ranking service that updates match scores as new intent signals arrive, without recomputing entire graphs.",
    expectations:
      "Implement incremental scoring, caching strategies, and observable performance metrics.",
    non_negotiables:
      "Experience designing read-optimized systems with predictable latency.",
    deal_breakers: "Over-engineering without measurable performance gains.",
    skills: ["Rust", "Redis", "Distributed Systems"],
  },
  {
    problem_statement:
      "Design internal APIs that allow multiple independent consumers to safely evolve without breaking matching correctness.",
    expectations:
      "Define internal contracts, versioning strategy, and guardrails against data leakage.",
    non_negotiables:
      "Strong API design discipline and schema versioning experience.",
    deal_breakers: "Tight coupling between services or consumers.",
    skills: ["TypeScript", "GraphQL", "PostgreSQL"],
  },
  {
    problem_statement:
      "Implement observability and explainability for automated matches under partial information.",
    expectations:
      "Expose why a match happened, what signals contributed, and where uncertainty exists.",
    non_negotiables: "Ability to instrument systems beyond logs.",
    deal_breakers: "Treating explainability as a UI-only concern.",
    skills: ["OpenTelemetry", "Prometheus", "Backend Systems"],
  },
];

const CANDIDATE_TEMPLATES = [
  {
    intent:
      "I want to work on backend systems where correctness, privacy, and scale matter more than surface features.",
    why: "I enjoy reasoning about trade-offs in distributed systems and making invisible decisions explicit.",
    tech: ["Go", "PostgreSQL", "Redis", "Kubernetes"],
  },
  {
    intent:
      "Looking to solve ambiguous system design problems where requirements evolve through use.",
    why: "I am comfortable building structure where none exists yet.",
    tech: ["TypeScript", "Distributed Systems", "GraphQL"],
  },
  {
    intent:
      "Interested in designing low-latency systems with strong observability and explainability.",
    why: "I believe systems should be debuggable by design.",
    tech: ["Rust", "Prometheus", "Redis"],
  },
  {
    intent:
      "I want to build platforms used by other engineers, not just end users.",
    why: "Internal correctness compounds faster than UI polish.",
    tech: ["Java", "PostgreSQL", "API Design"],
  },
  {
    intent:
      "Focused on privacy-first architectures and minimizing early bias in automated systems.",
    why: "Bad defaults silently create bad outcomes.",
    tech: ["Go", "Security", "Distributed Systems"],
  },
];

async function main() {
  console.log("🌱 Starting Seed (Limited to 50 records per table)...");

  // 1. Identify Existing Users
  const existingUsers = await prisma.user.findMany({
    include: { companies: true },
  });

  const existingRecruiters = existingUsers.filter(
    (u) => u.role === UserRole.recruiter,
  );
  const existingCandidates = existingUsers.filter(
    (u) => u.role === UserRole.candidate,
  );

  console.log(
    `Found ${existingRecruiters.length} existing recruiters and ${existingCandidates.length} existing candidates.`,
  );

  // 2. Ensure existing recruiters have companies
  const allCompanies = [];
  for (const recruiter of existingRecruiters) {
    if (recruiter.companies.length === 0) {
      const company = await prisma.company.create({
        data: {
          name: `${recruiter.name.split(" ")[0]}'s Stealth Startup`,
          website: faker.internet.url(),
          verified: true,
          recruiter_id: recruiter.id,
          created_at: faker.date.past(),
        },
      });
      allCompanies.push(company);
    } else {
      allCompanies.push(...recruiter.companies);
    }
  }

  // 3. Create recruiters and companies until we have 50 companies
  const recruitersToCreate = Math.max(0, 50 - allCompanies.length);
  console.log(`Creating ${recruitersToCreate} new recruiters and companies...`);
  for (let i = 0; i < recruitersToCreate; i++) {
    const recruiter = await prisma.user.create({
      data: {
        role: UserRole.recruiter,
        name: faker.person.fullName(),
        email: faker.internet.email(),
        photo_url: faker.image.avatar(),
        created_at: faker.date.past(),
      },
    });

    const company = await prisma.company.create({
      data: {
        name: faker.company.name(),
        website: faker.internet.url(),
        verified: faker.datatype.boolean(0.8),
        recruiter_id: recruiter.id,
        created_at: faker.date.past(),
      },
    });
    allCompanies.push(company);
  }

  // 4. Create candidates until we have 50 candidates
  const allCandidates = [...existingCandidates];
  const candidatesToCreate = Math.max(0, 50 - allCandidates.length);
  console.log(`Creating ${candidatesToCreate} new candidates...`);
  for (let i = 0; i < candidatesToCreate; i++) {
    const template = faker.helpers.arrayElement(CANDIDATE_TEMPLATES);
    const candidate = await prisma.user.create({
      data: {
        role: UserRole.candidate,
        name: faker.person.fullName(),
        email: faker.internet.email(),
        photo_url: faker.image.avatar(),
        intent_text: template.intent,
        why_text: template.why,
        constraints_json: {
          preferred_salary: faker.number.int({ min: 100000, max: 350000 }),
          preferred_locations: ["Remote"],
          remote_only: true,
        },
        skills: {
          create: template.tech.map((s) => ({
            name: s,
            source: "manual",
            confidence_score: 0.9,
          })),
        },
      },
    });
    allCandidates.push(candidate as any);
  }

  // 5. Create Jobs until we have exactly 50 jobs
  console.log("Creating exactly 50 jobs...");
  const existingJobCount = await prisma.job.count();
  const jobsToCreate = Math.max(0, 50 - existingJobCount);
  const allJobs = await prisma.job.findMany();

  for (let j = 0; j < jobsToCreate; j++) {
    const company = faker.helpers.arrayElement(allCompanies);
    const template = faker.helpers.arrayElement(JOB_TEMPLATES);
    const job = await prisma.job.create({
      data: {
        company_id: company.id,
        problem_statement: template.problem_statement,
        expectations: template.expectations,
        non_negotiables: template.non_negotiables,
        deal_breakers: template.deal_breakers,
        skills_required: template.skills,
        constraints_json: {
          salary_range: [150000, 300000],
          location: "Remote",
          role_type: "Full-stack",
        },
      },
    });
    allJobs.push(job);
  }

  // 6. Generate Flows - Target Exactly 50 for each
  console.log("Generating flows (Target: 50 per action)...");

  // 50 Swipes
  let swipeCount = await prisma.swipe.count();
  while (swipeCount < 50) {
    const candidate = faker.helpers.arrayElement(allCandidates);
    const job = faker.helpers.arrayElement(allJobs);
    try {
      await prisma.swipe.create({
        data: {
          user_id: candidate.id,
          job_id: job.id,
          direction: faker.helpers.arrayElement([
            SwipeDirection.left,
            SwipeDirection.right,
          ]),
          created_at: faker.date.recent({ days: 30 }),
        },
      });
      swipeCount++;
    } catch {}
  }

  // 50 Applications
  let appCount = await prisma.application.count();
  while (appCount < 50) {
    const candidate = faker.helpers.arrayElement(allCandidates);
    const job = faker.helpers.arrayElement(allJobs);
    try {
      await prisma.application.create({
        data: {
          user_id: candidate.id,
          job_id: job.id,
          status: "pending",
          cover_note: faker.lorem.sentence(),
          created_at: faker.date.recent({ days: 20 }),
        },
      });
      appCount++;
    } catch {}
  }

  // 50 Matches
  let matchCount = await prisma.match.count();
  const matches = await prisma.match.findMany();
  while (matchCount < 50) {
    const candidate = faker.helpers.arrayElement(allCandidates);
    const job = faker.helpers.arrayElement(allJobs);
    try {
      const match = await prisma.match.create({
        data: {
          candidate_id: candidate.id,
          job_id: job.id,
          reveal_status: false,
          explainability_json: { score: 0.95, reasoning: "Manual seed." },
        },
      });
      matches.push(match);
      matchCount++;
    } catch {}
  }

  // 50 Messages
  let msgCount = await prisma.message.count();
  while (msgCount < 50) {
    const match = faker.helpers.arrayElement(matches);
    const company = await prisma.company.findFirst({
      where: { jobs: { some: { id: match.job_id } } },
      select: { recruiter_id: true },
    });

    if (company) {
      try {
        await prisma.message.create({
          data: {
            match_id: match.id,
            sender_id: faker.helpers.arrayElement([
              match.candidate_id,
              company.recruiter_id,
            ]),
            content: faker.lorem.sentence(),
            created_at: faker.date.recent({ days: 5 }),
          },
        });
        msgCount++;
      } catch {}
    }
  }

  console.log(`\n✨ Seed Complete (Capped)!`);
  console.log(`📊 Current Counts:`);
  console.log(`- Candidates: ${allCandidates.length}`);
  console.log(`- Companies: ${allCompanies.length}`);
  console.log(`- Jobs: ${await prisma.job.count()}`);
  console.log(`- Swipes: ${await prisma.swipe.count()}`);
  console.log(`- Applications: ${await prisma.application.count()}`);
  console.log(`- Matches: ${await prisma.match.count()}`);
  console.log(`- Messages: ${await prisma.message.count()}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
