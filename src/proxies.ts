import axios, {
  type AxiosInstance,
  type AxiosProxyConfig,
  type AxiosResponse,
} from "axios"
import dotenv from "dotenv"
import axiosRetry from "axios-retry"
patchAxiosWithRetryLogic(axios)

dotenv.config({
  path: new URL("../.env", import.meta.url).pathname,
})

/**
 * Fetch proxies from the proxy fetch URL
 *
 * Expected a raw text file with one proxy per line
 *
 * Proxies should be formatted as "host:port:username:password"
 */
export async function getProxies(): Promise<string[]> {
  try {
    const response = await axios.get(process.env.PROXY_FETCH_URL)
    // The provider serves this list with CRLF terminators. Splitting on "\n"
    // alone leaves a trailing "\r" on every line, which ends up inside the
    // proxy password and makes every request fail with 407 Proxy
    // Authentication Required.
    return response.data
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  } catch (error) {
    console.error("Error while fetching proxies from proxy fetch URL", error)
    return null
  }
}

/**
 * Convert a proxy string to an Axios proxy object
 *
 * @param proxy proxy string in the format "host:port:username:password"
 */
function toAxiosObject(proxy: string): AxiosProxyConfig {
  return {
    host: proxy.split(":")[0],
    port: parseInt(proxy.split(":")[1]),
    auth: {
      username: proxy.split(":")[2],
      password: proxy.split(":")[3],
    },
  }
}

let axiosInstances: AxiosInstance[] = []

const createAxiosInstance = (proxy?: string) => {
  const instance = axios.create({
    proxy: proxy
      ? {
          ...toAxiosObject(proxy),
          protocol: "http",
        }
      : undefined,
  })
  patchAxiosWithRetryLogic(instance)
  return instance
}

let axiosInstancesPromise: Promise<void> | null = null
/**
 * Initialize axios instances
 *
 * Create a default axios instance without proxy
 * Create axios instances for each proxy
 *
 * If it is called multiple times, it will return the promise of the first call to avoid duplicate initialization (helps with concurrency)
 */
async function initAxiosInstances(): Promise<void> {
  if (axiosInstancesPromise) {
    return axiosInstancesPromise
  }
  axiosInstancesPromise = new Promise(async (resolve, reject) => {
    axiosInstances = []
    const proxies = await getProxies()

    if (!proxies || proxies.length === 0) {
      axiosInstances.push(
        createAxiosInstance() // default axios instance without proxy
      )
    }
    for (const proxy of proxies) {
      console.log(`Creating axios instance with proxy ${proxy}`)
      axiosInstances.push(createAxiosInstance(proxy))
    }
    console.log(`Created ${axiosInstances.length} axios instances`)
    resolve()
  })
  await axiosInstancesPromise
}

let nextAxiosInstanceIndex: number | null = null
/**
 * Pseudo random axios instance, helps prevent rate limiting
 *
 * Starts at random position then rotate
 */
export async function getRandomAxios(): Promise<AxiosInstance> {
  if (axiosInstances.length === 0) {
    await initAxiosInstances()
  }
  if (nextAxiosInstanceIndex === null) {
    nextAxiosInstanceIndex = Math.floor(Math.random() * axiosInstances.length)
  } else {
    nextAxiosInstanceIndex =
      (nextAxiosInstanceIndex + 1) % axiosInstances.length
  }
  return axiosInstances[nextAxiosInstanceIndex]
}

function patchAxiosWithRetryLogic(instance: AxiosInstance) {
  // Per-instance retries handle transient network glitches / 5xx on the same
  // proxy. Bans (403/407/429) are handled by proxy-level failover below, so we
  // keep this low to avoid multiplying latency when a proxy is permanently bad.
  axiosRetry(instance, {
    retries: 2,
    retryDelay: (retryCount) => retryCount * 500,
  })
}

/**
 * GET a URL with proxy failover.
 *
 * Tries up to `maxAttempts` distinct proxy instances, rotating to a new one on
 * any failure (proxy ban, auth error, rate limit, network error, 5xx). This
 * makes the service resilient to individual proxies being banned or having
 * their credentials revoked, which happens regularly with our proxy pool.
 */
export async function getWithProxyFailover(
  url: string,
  opts: { maxAttempts?: number } = {}
): Promise<AxiosResponse> {
  if (axiosInstances.length === 0) {
    await initAxiosInstances()
  }

  const maxAttempts = Math.min(
    opts.maxAttempts ?? 5,
    Math.max(axiosInstances.length, 1)
  )

  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const instance = await getRandomAxios()
    try {
      return await instance.get(url)
    } catch (error: any) {
      lastError = error
      const status = error?.response?.status
      const proxyHost = error?.request?.host || error?.config?.proxy?.host
      console.warn(
        `Proxy attempt ${attempt}/${maxAttempts} failed for ${url} (status=${
          status ?? "network"
        }, proxy=${proxyHost ?? "?"}): ${error?.message ?? error}`
      )
    }
  }
  throw lastError
}
