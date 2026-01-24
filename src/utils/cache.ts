import redisClient from "../config/redis";

// Default TTL: 6 hours (in seconds)
const DEFAULT_TTL = 6 * 60 * 60;

export const getCache = async (key: string) => {
  if (process.env.DISABLE_CACHE === "true") {
    return null;
  }
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error("Redis get error", err);
    return null;
  }
};

export const setCache = async (
  key: string,
  data: any,
  ttlSeconds: number = DEFAULT_TTL,
) => {
  try {
    // If ttlSeconds is passed in MS (large number), convert to seconds roughly
    if (ttlSeconds > 100000) {
      ttlSeconds = Math.floor(ttlSeconds / 1000);
    }

    await redisClient.set(key, JSON.stringify(data), {
      EX: ttlSeconds,
    });
  } catch (err) {
    console.error("Redis set error", err);
  }
};

export const deleteCache = async (key: string) => {
  try {
    await redisClient.del(key);
  } catch (err) {
    console.error("Redis delete error", err);
  }
};
