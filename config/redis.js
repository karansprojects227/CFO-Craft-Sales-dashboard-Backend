const Redis = require("ioredis");

const redis = new Redis("redis://127.0.0.1:6379");

redis.on("connect", () => console.log("Redis connected (Localhost)"));
redis.on("error", (err) => console.error("Redis error:", err));

module.exports = redis;