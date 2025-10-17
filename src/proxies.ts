import axios, { AxiosInstance, AxiosProxyConfig } from "axios"
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
    return response.data.split("\n").filter((line) => line.length > 0)
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
  axiosRetry(instance, {
    retries: 5,
    retryDelay: (retryCount) => {
      return retryCount * 1000
    },
  })
}
