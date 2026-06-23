import Redis from 'ioredis';
import logger from './logger.js';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
let redisConnection = null;
let isRedisConnected = false;

try {
  logger.info(`Attempting to connect to Redis at ${redisUrl}...`);
  redisConnection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      if (times > 3) {
        logger.warn(`Redis connection retry limit reached. Redis will run in fallback mock-mode.`);
        isRedisConnected = false;
        return null;
      }
      return Math.min(times * 100, 2000);
    }
  });

  redisConnection.on('connect', () => {
    isRedisConnected = true;
    logger.info('Redis connection established successfully.');
  });

  redisConnection.on('error', (err) => {
    logger.error(`Redis Error: ${err.message}. Background ingestion will run in-memory.`);
    isRedisConnected = false;
  });
} catch (error) {
  logger.error(`Redis Initialization Error: ${error.message}`);
}

// ── Cache Helpers ──────────────────────────────────────────────
const memoryCache = new Map();

export const getCache = async (key) => {
  try {
    if (isRedisConnected && redisConnection) {
      return await redisConnection.get(key);
    }
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { memoryCache.delete(key); return null; }
    return entry.value;
  } catch { return null; }
};

export const setCache = async (key, value, ttlSeconds = 300) => {
  try {
    if (isRedisConnected && redisConnection) {
      await redisConnection.set(key, value, 'EX', ttlSeconds);
    } else {
      memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    }
  } catch { /* silent */ }
};

export const deleteCache = async (key) => {
  try {
    if (isRedisConnected && redisConnection) {
      if (key.includes('*')) {
        const keys = await redisConnection.keys(key);
        if (keys.length > 0) await redisConnection.del(...keys);
      } else {
        await redisConnection.del(key);
      }
    } else {
      if (key.includes('*')) {
        const prefix = key.replace('*', '');
        for (const k of memoryCache.keys()) {
          if (k.startsWith(prefix)) memoryCache.delete(k);
        }
      } else {
        memoryCache.delete(key);
      }
    }
  } catch { /* silent */ }
};

export const waitForRedis = (timeoutMs = 1500) => {
  return new Promise((resolve) => {
    if (isRedisConnected) return resolve(true);

    const onConnect = () => {
      cleanup();
      resolve(true);
    };

    const onError = () => {
      cleanup();
      resolve(false);
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      if (redisConnection) {
        redisConnection.off('connect', onConnect);
        redisConnection.off('error', onError);
      }
    };

    if (redisConnection) {
      redisConnection.on('connect', onConnect);
      redisConnection.on('error', onError);
    } else {
      cleanup();
      resolve(false);
    }
  });
};

export { redisConnection, isRedisConnected, redisUrl };
