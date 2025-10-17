/**
 * This script automatically computes the list of supported games by scraping the Liquipedia website.
 *
 * It checks the different known URLs for match pages and checks if we can compute any matches. It does not mean that everything will work right out of the box, but it means that we can adapt our code to fully support it (ie. by adding new selectors for example).
 */
import * as cheerio from "cheerio"
import { getRandomAxios } from "../src/proxies.js"
import { parseEventsFromUrl } from "../src/parse.js"
import fs from "fs"
import path from "path"
import {
  supportedGamesDisabled,
  supportedGamesOverload,
} from "../meta/supportedGames.config.js"
import colors from "colors"

colors.enable()

// Init storage
const supportedGames: SupportedGame[] = []

/**
 * Utility function to set deep props from source into target
 */
const deepSet = (target: Object, source: Object) => {
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "object" && value !== null) {
      deepSet(target[key], value)
    } else {
      target[key] = value
    }
  }
}

interface GameBaseData {
  id: string
  name: string
}

/**
 * Parse Liquipedia menu to get the list of game IDs
 */
async function getGameBaseData(): Promise<GameBaseData[]> {
  const axios = await getRandomAxios()
  const response = await axios.get(
    "https://liquipedia.net/rocketleague/Liquipedia:Matches"
  )

  const html = response.data

  const $ = cheerio.load(html)

  const games: GameBaseData[] = []
  const gamesElements = $(".ext-wikimenu-content-link")
  for (const gameElement of gamesElements) {
    const href = $(gameElement).find("a").attr("href")
    const gameId = href?.split("/")?.at(1)
    if (!gameId) {
      console.error(`Could not get game ID from ${href}`.red)
      continue
    }
    const name = $(gameElement).find(".ext-wikimenu-text").text().trim()
    games.push({ id: gameId, name })
  }
  return games
}

/**
 * Get the potential match URLs for a given game ID.
 *
 * Based on what we experienced already during our research
 */
function getPotentialMatchUrls(id: string): string[] {
  return [
    `https://liquipedia.net/${id}/Liquipedia:Matches`,
    `https://liquipedia.net/${id}/Liquipedia:Upcoming_and_ongoing_matches`,
  ]
}

/**
 * Main loop to compute the list of supported games
 */
const promises: Promise<void>[] = []
const gameBaseData = await getGameBaseData()
for (const { id, name } of gameBaseData) {
  promises.push(
    (async () => {
      if (supportedGamesDisabled.includes(id)) {
        console.warn(`${id} is disabled`.gray)
        return
      }
      const tryUrls = getPotentialMatchUrls(id)

      let matchUrl: string | null = null
      for (const url of tryUrls) {
        try {
          // check if we can parse any matches from this URL
          const eventList = await parseEventsFromUrl(
            url,
            {
              shouldVerbose: true,
              pastMatchAllowSeconds: 60 * 60 * 24 * 365 * 30,
            },
            () => {}
          )
          if (eventList.length > 0) {
            matchUrl = url
            break
          }
        } catch (error) {
          // if we can't parse any matches from this URL, try the next one
          continue
        }
      }
      if (!matchUrl) {
        console.warn(`${id}: no match URL found`.red)
        return
      }

      const supportedGame: SupportedGame = {
        id,
        name,
        url: matchUrl,
        baseUrl: `https://liquipedia.net/${id}`,
        enforcedOpts: {},
      }

      deepSet(supportedGame, supportedGamesOverload[id] || {})
      supportedGames[id] = supportedGame

      console.log(`${id.bold}: added to supported games`.green)
    })()
  )
}

await Promise.all(promises)

const DATA_FILE = path.resolve(
  __dirname,
  "..",
  "meta",
  "supportedGames.doNotEdit.json"
)
fs.writeFileSync(DATA_FILE, JSON.stringify(supportedGames, null, 2))
