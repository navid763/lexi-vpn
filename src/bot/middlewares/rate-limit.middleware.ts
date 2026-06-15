// Per-user rate limiter for bot interactions.
// Uses a sliding-window token-bucket approach stored in memory.
// This is intentionally simple — at current scale a Redis-backed
// solution is unnecessary overhead.

interface Bucket {
    tokens: number;
    lastRefill: number;
}

const buckets = new Map<string, Bucket>();

// Config: each user gets CAPACITY tokens, refilled at REFILL_RATE per second.
// A message/callback consumes 1 token. When empty → user is throttled.
const CAPACITY = 10;          // max burst
const REFILL_RATE = 1;        // tokens per second
const CLEANUP_INTERVAL = 5 * 60 * 1000; // purge stale entries every 5 min

// Purge buckets that haven't been touched in 5 minutes to avoid memory leaks
setInterval(() => {
    const cutoff = Date.now() - 5 * 60 * 1000;
    for (const [key, bucket] of buckets.entries()) {
        if (bucket.lastRefill < cutoff) buckets.delete(key);
    }
}, CLEANUP_INTERVAL);

/**
 * Returns true if the user is allowed to proceed, false if rate-limited.
 */
export function checkRateLimit(chatId: number | string): boolean {
    const key = String(chatId);
    const now = Date.now();

    let bucket = buckets.get(key);

    if (!bucket) {
        bucket = { tokens: CAPACITY - 1, lastRefill: now };
        buckets.set(key, bucket);
        return true;
    }

    // Refill tokens based on elapsed time
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(CAPACITY, bucket.tokens + elapsed * REFILL_RATE);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return true;
    }

    return false;
}