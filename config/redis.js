const Redis = require("ioredis");

const redis = new Redis(process.env.UPSTASH_REDIS_URL, {
  tls: { rejectUnauthorized: false } // Upstash TLS
});

redis.on("connect", () => console.log("Redis connected (Localhost)"));
redis.on("error", (err) => console.error("Redis error:", err));


module.exports = redis;
