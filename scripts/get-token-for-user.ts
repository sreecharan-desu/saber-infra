import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "dfb3f9a5817460fd67720b88377c7b8023d8771ea3f234d464fc2e774355b5c9";

async function main() {
  const targetEmail = "alaharibhanuprakash.04@gmail.com";

  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
  });

  if (!user) {
    console.error(`User ${targetEmail} not found`);
    return;
  }

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: "1h",
  });

  console.log("TOKEN=" + token);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
