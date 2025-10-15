import axios, { AxiosInstance, AxiosProxyConfig } from "axios"
import dotenv from "dotenv"

dotenv.config()

/**
 * Fetch proxies from the proxy fetch URL
 *
 * Expected a raw text file with one proxy per line
 *
 * Proxies should be formatted as "host:port:username:password"
 */
export async function getProxies(): Promise<string[]> {
  const response = await fetch(process.env.PROXY_FETCH_URL)
  const data = await response.text()
  return data.split("\n").filter((line) => line.length > 0)
}

/**
 * Convert a proxy string to an Axios proxy object
 *
 * @param proxy proxy string in the format "host:port:username:password"
 */
export function toAxiosObject(proxy: string): AxiosProxyConfig {
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

/**
 * Initialize axios instances
 *
 * Create a default axios instance without proxy
 * Create axios instances for each proxy
 */
async function initAxiosInstances() {
  axiosInstances = []
  axiosInstances.push(
    axios.create() // default axios instance without proxy
  )
  const proxies = await getProxies()
  for (const proxy of proxies) {
    console.log(`Creating axios instance with proxy ${proxy}`)
    axiosInstances.push(
      axios.create({
        proxy: {
          ...toAxiosObject(proxy),
          protocol: "http",
        },
      })
    )
  }
  console.log(`Created ${axiosInstances.length} axios instances`)
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
