import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "dfb3f9a5817460fd67720b88377c7b8023d8771ea3f234d464fc2e774355b5c9";

async function main() {
  // 1. Get a Candidate
  const candidate = await prisma.user.findFirst({
    where: { role: "candidate" },
  });

  // 2. Get a Recruiter
  const recruiter = await prisma.user.findFirst({
    where: { role: "recruiter" }, // Ensure case matches enum
  });

  if (!candidate || !recruiter) {
    console.error("Could not find users to test. Seed DB first.");
    return;
  }

  // 3. Generate Tokens
  // Payload usually matches what you store (id, role, etc)
  const candidateToken = jwt.sign(
    { id: candidate.id, role: candidate.role },
    JWT_SECRET,
    { expiresIn: "1h" },
  );
  const recruiterToken = jwt.sign(
    { id: recruiter.id, role: recruiter.role },
    JWT_SECRET,
    { expiresIn: "1h" },
  );

  console.log("CANDIDATE_TOKEN=" + candidateToken);
  console.log("RECRUITER_TOKEN=" + recruiterToken);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
