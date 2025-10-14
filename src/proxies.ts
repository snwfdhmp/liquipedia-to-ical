import axios from "axios"
import dotenv from "dotenv"

dotenv.config()

export const getProxies = async () => {
  const response = await fetch(process.env.PROXY_FETCH_URL)
  const data = await response.text()
  return data.split("\n").filter((line) => line.length > 0)
}

export const toAxiosObject = (proxy) => {
  return {
    host: proxy.split(":")[0],
    port: proxy.split(":")[1],
    username: proxy.split(":")[2],
    password: proxy.split(":")[3],
  }
}

let axiosInstances = []

export const initAxiosInstances = async () => {
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

export const getRandomAxios = async () => {
  if (axiosInstances.length === 0) {
    await initAxiosInstances()
  }
  return axiosInstances[Math.floor(Math.random() * axiosInstances.length)]
}
