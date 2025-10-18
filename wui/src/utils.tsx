import { useContext, useEffect, useRef, useState, type Context } from "react"
import { type Config } from "@/hooks/useConfig"
import {
  supportedGames,
  supportedGamesHashMap,
} from "../../meta/supportedGames"
import { apiOptions } from "../../meta/apiOptions"

export function useContextSelector<T, R>(
  context: Context<T>,
  selector: (value: T) => R,
): R {
  const contextValue = useContext(context)
  const [selectedValue, setSelectedValue] = useState(() =>
    selector(contextValue),
  )
  const selectorRef = useRef(selector)
  const selectedValueRef = useRef(selectedValue)

  // Update selector ref
  selectorRef.current = selector

  useEffect(() => {
    const newSelectedValue = selectorRef.current(contextValue)

    // Only update if the selected value has changed
    if (!Object.is(selectedValueRef.current, newSelectedValue)) {
      selectedValueRef.current = newSelectedValue
      setSelectedValue(newSelectedValue)
    }
  }, [contextValue])

  return selectedValue
}

export const createIcsUrlFromConfig = (config: Config) => {
  console.log(config)
  const gameParams = Object.entries(config.selectedGames).map(
    ([gameId, gameConfig], index) => {
      console.log(gameId, gameConfig, supportedGamesHashMap)
      return [
        {
          key: `${index}_url`,
          value: supportedGamesHashMap[gameId].url,
        },
        ...Object.entries(gameConfig.parserOptions || {}).map(
          ([key, value]) => ({
            key: `${index}_${apiOptions[key as keyof ParserOptions].urlParam}`,
            value,
          }),
        ),
      ]
    },
  )

  const baseUrl = "https://ics.snwfdhmp.com/matches.ics"
  const url = new URL(baseUrl)
  gameParams.flat().forEach((param) => {
    url.searchParams.set(param.key, param.value)
  })

  const staticParams = [{ key: "is_from_configurator", value: "true" }]
  staticParams.forEach((param) => {
    url.searchParams.set(param.key, param.value)
  })

  return url.toString()
}

export const wrapUrl = (url: string) => {
  if (!url) return null
  url = url.replace("https://", "")
  url = url.replace("http://", "")

  return `https://http-wrapper.snwfdhmp.com/${url}`
}

export const relativeDate = (date: Date) => {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  // Normalize dates to compare only the date part (not time)
  const normalizeDate = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate())

  const normalizedDate = normalizeDate(date)
  const normalizedToday = normalizeDate(today)
  const normalizedYesterday = normalizeDate(yesterday)
  const normalizedTomorrow = normalizeDate(tomorrow)

  if (normalizedDate.getTime() === normalizedYesterday.getTime()) {
    return "yesterday"
  }

  if (normalizedDate.getTime() === normalizedToday.getTime()) {
    return "today"
  }

  if (normalizedDate.getTime() === normalizedTomorrow.getTime()) {
    return "tomorrow"
  }

  // Format as "Mon 12 December"
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "long",
  })
}

export const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
