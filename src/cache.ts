const cache = {}
const CACHE_TIMEOUT_MS = 1000 * 299
export const getCache = async (hash) => {
  if (cache[hash] && cache[hash].expiresAt > Date.now()) {
    return cache[hash].data
  }
  return null
}
export const setCache = async (hash, data) => {
  cache[hash] = {
    data,
    expiresAt: Date.now() + CACHE_TIMEOUT_MS,
  }
}
