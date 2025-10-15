const cache = {}
const CACHE_TIMEOUT_MS = 1000 * 299

/**
 * Get cached data from the cache
 *
 * Returns null if not found or expired
 * Deletes the entry from the cache if expired
 */
export const getCache = (hash) => {
  if (cache[hash] && cache[hash].expiresAt > Date.now()) {
    return cache[hash].data
  }
  delete cache[hash]
  return null
}

/**
 * Set cached data in the cache with expiration time
 */
export const setCache = (hash, data) => {
  cache[hash] = {
    data,
    expiresAt: Date.now() + CACHE_TIMEOUT_MS,
  }
}
