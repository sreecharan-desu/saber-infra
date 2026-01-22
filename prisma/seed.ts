import { PrismaClient, UserRole, SwipeDirection } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

const TECH_STACKS = [
  'React', 'Node.js', 'TypeScript', 'Python', 'Django', 'FastAPI', 'Go', 'Rust', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'PostgreSQL', 'MongoDB', 'Redis', 'GraphQL', 'Next.js', 'Vue.js', 'Angular', 'Java', 'Spring Boot', 'C#', '.NET', 'Swift', 'Kotlin', 'Flutter', 'React Native', 'Terraform', 'Ansible'
];

function getRandomSkills(count: number = 5) {
  return faker.helpers.arrayElements(TECH_STACKS, count);
}

const JOB_TEMPLATES = [
  {
    problem_statement: "We are scaling our real-time notification system to handle 1M+ concurrent users. The current polling architecture is inefficient.",
    expectations: "Design and implement a scalable WebSocket-based microservice. Optimize message delivery guarantees and reduce latency.",
    non_negotiables: "Experience with high-concurrency systems and WebSocket.",
    deal_breakers: "No experience with asynchronous event-driven architectures.",
    skills: ['Node.js', 'Redis', 'TypeScript', 'Docker']
  },
  {
    problem_statement: "Our React frontend is experiencing performance bottlenecks on mobile devices due to large bundle sizes.",
    expectations: "Refactor the core application to use Next.js. Implement code splitting, lazy loading, and optimize components.",
    non_negotiables: "Deep understanding of React rendering cycle and performance optimization.",
    deal_breakers: "Unfamiliarity with server-side rendering concepts.",
    skills: ['React', 'Next.js', 'TypeScript']
  },
  {
    problem_statement: "We need to migrate our monolithic backend to a microservices architecture on Kubernetes.",
    expectations: "Containerize existing services, define Kubernetes manifests, and set up a CI/CD pipeline.",
    non_negotiables: "Production experience with Kubernetes and Docker.",
    deal_breakers: "Lack of experience with cloud-native infrastructure.",
    skills: ['Python', 'Docker', 'Kubernetes', 'AWS']
  },
  {
    problem_statement: "Processing terabytes of data daily for real-time analytics is becoming a bottleneck.",
    expectations: "Build a robust data pipeline using Go and optimize database queries on PostgreSQL.",
    non_negotiables: "Strong background in distributed systems and SQL optimization.",
    deal_breakers: "No experience with typed languages like Go or Rust.",
    skills: ['Go', 'PostgreSQL', 'AWS']
  },
  {
    problem_statement: "We are launching a cross-platform mobile app for our fintech product.",
    expectations: "Develop a secure, high-performance mobile app using Flutter. Integrate with REST APIs.",
    non_negotiables: "Experience with mobile security best practices.",
    deal_breakers: "Only native development experience without framework knowledge.",
    skills: ['Flutter', 'Android', 'iOS']
  }
];

const CANDIDATE_TEMPLATES = [
  {
    intent: "I am looking for a Senior Backend role where I can architect scalable distributed systems.",
    why: "I thrive in solving complex concurrency problems and optimizing system performance.",
    tech: ['Go', 'Rust', 'Kubernetes', 'AWS', 'PostgreSQL']
  },
  {
    intent: "Seeking a Full Stack Engineer position with a focus on React and Node.js.",
    why: "I value clean code and developer experience. I am passionate about building products users love.",
    tech: ['React', 'Node.js', 'TypeScript', 'Next.js', 'GraphQL']
  },
  {
    intent: "I am a DevOps Engineer looking to help teams automate their infrastructure.",
    why: "I believe in 'Infrastructure as Code' and want to eliminate manual toil.",
    tech: ['Docker', 'Kubernetes', 'Terraform', 'Ansible', 'AWS']
  },
  {
    intent: "Aspiring Mobile Developer looking for opportunities in the fintech space.",
    why: "I am fascinated by the challenge of making secure financial tools accessible on mobile devices.",
    tech: ['Flutter', 'React Native', 'Swift', 'Kotlin']
  },
  {
    intent: "Data Engineer interested in building real-time processing pipelines.",
    why: "I enjoy turning raw data into actionable insights.",
    tech: ['Python', 'Django', 'PostgreSQL', 'MongoDB', 'Redis']
  }
];

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Clean existing data
  await prisma.message.deleteMany();
  await prisma.match.deleteMany();
  await prisma.swipe.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.job.deleteMany();
  await prisma.company.deleteMany();
  await prisma.recommendationProfile.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing data');

  // 2. Create Recruiters (5) & Companies (5)
  const recruiters = [];
  const companies = [];

  for (let i = 0; i < 5; i++) {
    const recruiter = await prisma.user.create({
      data: {
        role: UserRole.recruiter,
        name: faker.person.fullName(),
        email: faker.internet.email(),
        photo_url: faker.image.avatar(),
        created_at: faker.date.past()
      }
    });
    recruiters.push(recruiter);

    const company = await prisma.company.create({
      data: {
        name: faker.company.name(),
        website: faker.internet.url(),
        verified: faker.datatype.boolean(0.8), // 80% verified
        recruiter_id: recruiter.id,
        created_at: faker.date.past()
      }
    });
    companies.push(company);
  }
  console.log(`✅ Created ${recruiters.length} recruiters and companies`);

  // 3. Create Jobs (50)
  const jobs = [];
  for (const company of companies) {
    // 10 jobs per company
    for (let i = 0; i < 10; i++) {
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
                  salary_range: [faker.number.int({ min: 60000, max: 90000 }), faker.number.int({ min: 100000, max: 180000 })],
                  experience_years: faker.number.int({ min: 1, max: 10 }),
                  location: faker.location.city()
                },
                active: true,
                created_at: faker.date.recent({ days: 60 })
            }
        });
        jobs.push(job);
    }
  }
  console.log(`✅ Created ${jobs.length} jobs`);

  // 4. Create Candidates (100) & Skills
  const candidates = [];
  for (let i = 0; i < 100; i++) {
    const template = faker.helpers.arrayElement(CANDIDATE_TEMPLATES);
    const skillsList = template.tech;
    
    // Create candidate
    const candidate = await prisma.user.create({
      data: {
        role: UserRole.candidate,
        name: faker.person.fullName(),
        email: faker.internet.email(),
        photo_url: faker.image.avatar(),
        intent_text: template.intent,
        why_text: template.why,
        constraints_json: {
          preferred_salary: faker.number.int({ min: 70000, max: 150000 }),
          preferred_locations: [faker.location.city(), faker.location.city()],
          remote_only: faker.datatype.boolean()
        },
        created_at: faker.date.past(),
        skills: {
            create: skillsList.map(s => ({
                name: s,
                source: 'manual', // or 'linkedin', 'github'
                confidence_score: faker.number.float({ min: 0.5, max: 1.0 })
            }))
        }
      }
    });

    // Create Recommendation Profile for AI
    await prisma.recommendationProfile.create({
        data: {
            user_id: candidate.id,
            positive_signals_json: {
                viewed_jobs: faker.helpers.arrayElements(jobs.map(j => j.id), 3),
                liked_skills: faker.helpers.arrayElements(TECH_STACKS, 2)
            },
            negative_signals_json: {
                disliked_companies: []
            },
            suppression_rules_json: {}
        }
    });

    candidates.push(candidate);
  }
  console.log(`✅ Created ${candidates.length} candidates`);

  // 5. Create Swipes (Random interactions) - ~500
  // Each candidate swipes on some jobs
  let swipeCount = 0;
  for (const candidate of candidates) {
      // Swipe on random 10 jobs
      const randomJobs = faker.helpers.arrayElements(jobs, faker.number.int({ min: 5, max: 15 }));
      
      for (const job of randomJobs) {
          await prisma.swipe.create({
              data: {
                  user_id: candidate.id,
                  job_id: job.id,
                  direction: faker.helpers.arrayElement([SwipeDirection.left, SwipeDirection.right]),
                  created_at: faker.date.recent({ days: 30 })
              }
          });
          swipeCount++;
      }
  }
  console.log(`✅ Created ${swipeCount} swipes`);

  // 6. Create Matches (Explicit matches) - ~30
  // Pick random candidate-job pairs and make them matches
  let matchCount = 0;
  for (let i = 0; i < 30; i++) {
     const candidate = faker.helpers.arrayElement(candidates);
     const job = faker.helpers.arrayElement(jobs);
     
     // Check if match already exists (crudely, just ignore error or be careful)
     // To avoid unique constraint error, we can just try/catch or simple check
     // Actually, simpler to just rely on unique constraints and `skipDuplicates` if prisma supported it easily here, 
     // but prisma mock doesn't. 
     // Let's just do a check or ensure uniqueness by set logic if needed.
     // For this simple seed, randomized repeats are rare enough or we can catch.
     
     const exists = await prisma.match.findFirst({
         where: { candidate_id: candidate.id, job_id: job.id }
     });
     
     if (!exists) {
         await prisma.match.create({
             data: {
                 candidate_id: candidate.id,
                 job_id: job.id,
                 reveal_status: faker.datatype.boolean(),
                 explainability_json: {
                     reason: "Strong skill overlap",
                     score: faker.number.float({ min: 0.8, max: 0.99 })
                 },
                 created_at: faker.date.recent({ days: 10 })
             }
         });
         matchCount++;
     }
  }
  console.log(`✅ Created ${matchCount} matches`);

  console.log('✨ Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
