import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react"
import { createIcsUrlFromConfig } from "@/utils"
import { supportedGames } from "../../../meta/supportedGames"

export interface Config {
  selectedGames: Record<
    string,
    {
      parserOptions?: ParserOptions
    }
  >
}

const ConfigContext = createContext<{
  config: Config
  setConfig: (config: Config) => void
  icsUrl: string
}>(undefined)

let parsedConfigFromUrl = false
export const ConfigProvider: React.FC<any> = ({ children }) => {
  const [config, setConfig] = useState<Config>({
    selectedGames: {
      rocketleague: {},
    },
  })

  useEffect(() => {
    if (!parsedConfigFromUrl) {
      const searchParams = new URLSearchParams(window.location.search)
      const config = searchParams.get("config")
      if (config) {
        setConfig(JSON.parse(config))
      }
      parsedConfigFromUrl = true
    }
  }, [])

  const icsUrl = useMemo(() => {
    return createIcsUrlFromConfig(config)
  }, [config])

  useEffect(() => {
    const searchParams = new URLSearchParams()
    searchParams.set("config", JSON.stringify(config))
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`
    window.history.pushState(null, "", newUrl)
  }, [config])

  const values = useMemo(
    () => ({ config, setConfig, icsUrl }),
    [config, setConfig, icsUrl],
  )

  return (
    <ConfigContext.Provider value={values}>{children}</ConfigContext.Provider>
  )
}

export const useConfig = () => {
  const context = useContext(ConfigContext)
  if (context === undefined) {
    throw new Error("useConfig must be used within a ConfigProvider")
  }
  return context
}
