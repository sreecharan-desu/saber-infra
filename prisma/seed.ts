import { PrismaClient, UserRole, SwipeDirection } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

const TECH_STACKS = [
  'TypeScript', 'Go', 'Rust', 'Java', 'PostgreSQL', 'Redis',
  'Kafka', 'Docker', 'Kubernetes', 'AWS', 'GCP',
  'GraphQL', 'gRPC', 'Next.js', 'React',
  'Terraform', 'Prometheus', 'OpenTelemetry'
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
    skills: ['TypeScript', 'PostgreSQL', 'Redis', 'Distributed Systems']
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
    skills: ['Go', 'Kafka', 'PostgreSQL', 'Kubernetes']
  },
  {
    problem_statement:
      "Build a real-time ranking service that updates match scores as new intent signals arrive, without recomputing entire graphs.",
    expectations:
      "Implement incremental scoring, caching strategies, and observable performance metrics.",
    non_negotiables:
      "Experience designing read-optimized systems with predictable latency.",
    deal_breakers:
      "Over-engineering without measurable performance gains.",
    skills: ['Rust', 'Redis', 'Distributed Systems']
  },
  {
    problem_statement:
      "Design internal APIs that allow multiple independent consumers to safely evolve without breaking matching correctness.",
    expectations:
      "Define internal contracts, versioning strategy, and guardrails against data leakage.",
    non_negotiables:
      "Strong API design discipline and schema versioning experience.",
    deal_breakers:
      "Tight coupling between services or consumers.",
    skills: ['TypeScript', 'GraphQL', 'PostgreSQL']
  },
  {
    problem_statement:
      "Implement observability and explainability for automated matches under partial information.",
    expectations:
      "Expose why a match happened, what signals contributed, and where uncertainty exists.",
    non_negotiables:
      "Ability to instrument systems beyond logs.",
    deal_breakers:
      "Treating explainability as a UI-only concern.",
    skills: ['OpenTelemetry', 'Prometheus', 'Backend Systems']
  }
];

const CANDIDATE_TEMPLATES = [
  {
    intent:
      "I want to work on backend systems where correctness, privacy, and scale matter more than surface features.",
    why:
      "I enjoy reasoning about trade-offs in distributed systems and making invisible decisions explicit.",
    tech: ['Go', 'PostgreSQL', 'Redis', 'Kubernetes']
  },
  {
    intent:
      "Looking to solve ambiguous system design problems where requirements evolve through use.",
    why:
      "I am comfortable building structure where none exists yet.",
    tech: ['TypeScript', 'Distributed Systems', 'GraphQL']
  },
  {
    intent:
      "Interested in designing low-latency systems with strong observability and explainability.",
    why:
      "I believe systems should be debuggable by design.",
    tech: ['Rust', 'Prometheus', 'Redis']
  },
  {
    intent:
      "I want to build platforms used by other engineers, not just end users.",
    why:
      "Internal correctness compounds faster than UI polish.",
    tech: ['Java', 'PostgreSQL', 'API Design']
  },
  {
    intent:
      "Focused on privacy-first architectures and minimizing early bias in automated systems.",
    why:
      "Bad defaults silently create bad outcomes.",
    tech: ['Go', 'Security', 'Distributed Systems']
  }
];

async function main() {
  console.log('🌱 Starting seed...');

  const existingUsers = await prisma.user.findMany({
    include: { companies: true }
  });

  const existingCandidates = existingUsers.filter(u => u.role === UserRole.candidate);
  const existingRecruiters = existingUsers.filter(u => u.role === UserRole.recruiter);

  const newRecruiters = [];
  const allCompanies = [...existingUsers.flatMap(u => u.companies)];

  for (let i = 0; i < 20; i++) {
    const recruiter = await prisma.user.create({
      data: {
        role: UserRole.recruiter,
        name: faker.person.fullName(),
        email: faker.internet.email(),
        photo_url: faker.image.avatar(),
        created_at: faker.date.past()
      }
    });
    newRecruiters.push(recruiter);

    const company = await prisma.company.create({
      data: {
        name: faker.company.name(),
        website: faker.internet.url(),
        verified: faker.datatype.boolean(0.7),
        recruiter_id: recruiter.id,
        created_at: faker.date.past()
      }
    });
    allCompanies.push(company);
  }

  const newCandidates = [];
  for (let i = 0; i < 100; i++) {
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
          preferred_salary: faker.number.int({ min: 120000, max: 280000 }),
          preferred_locations: ['Remote'],
          remote_only: true
        },
        skills: {
          create: template.tech.map(s => ({
            name: s,
            source: faker.helpers.arrayElement(['manual', 'github']),
            confidence_score: faker.number.float({ min: 0.7, max: 0.95 })
          }))
        }
      }
    });
    newCandidates.push(candidate);
  }

  const allCandidates = [...existingCandidates, ...newCandidates];

  const allJobs = [];
  for (const company of allCompanies) {
    const jobCount = faker.number.int({ min: 2, max: 4 });
    for (let j = 0; j < jobCount; j++) {
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
            salary_range: [120000, 250000],
            location: 'Remote',
            role_type: 'Problem-Based'
          }
        }
      });
      allJobs.push(job);
    }
  }

  let swipeCount = 0;
  let matchCount = 0;

  for (const candidate of allCandidates) {
    const sampleJobs = faker.helpers.arrayElements(allJobs, faker.number.int({ min: 10, max: 20 }));
    for (const job of sampleJobs) {
      const direction = faker.helpers.arrayElement([SwipeDirection.left, SwipeDirection.right]);

      try {
        await prisma.swipe.create({
          data: {
            user_id: candidate.id,
            job_id: job.id,
            direction,
            created_at: faker.date.recent({ days: 14 })
          }
        });
        swipeCount++;

        if (direction === SwipeDirection.right && faker.datatype.boolean(0.25)) {
          await prisma.match.create({
            data: {
              candidate_id: candidate.id,
              job_id: job.id,
              reveal_status: faker.datatype.boolean(0.3),
              explainability_json: {
                score: faker.number.float({ min: 0.8, max: 0.97 }),
                aligned_signals: faker.helpers.arrayElements(['intent', 'constraints', 'skills'], 2)
              }
            }
          });
          matchCount++;
        }
      } catch {}
    }
  }

  console.log(`✅ Seeded ${swipeCount} swipes and ${matchCount} matches.`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
