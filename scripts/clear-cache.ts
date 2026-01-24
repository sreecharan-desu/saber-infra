import redisClient from "../src/config/redis";
import dotenv from "dotenv";

dotenv.config();

async function clearCache() {
  if (!redisClient.isOpen) {
    console.log("Connecting to Redis...");
    await redisClient.connect();
  }

  console.log("Flushing all keys...");
  await redisClient.flushAll();

  console.log("✅ Redis Cache Cleared.");
  await redisClient.disconnect();
}

clearCache().catch(console.error);
