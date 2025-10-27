import express from "express"
import axios from "axios"
import { insertTelemetry, updateTelemetry } from "./telemetry.js"
import { presets } from "./presets.js"
import { fetchMatches } from "./fetch.js"
import { buildCalendar, mergeIcs } from "./ics.js"
import { supportedGames } from "../meta/supportedGames.js"
import { ParserOptions, EventData } from "./types.js"

const setHeadersForIcs = (res: express.Response) => {
  res.setHeader("Content-Type", "text/calendar; charset=utf-8")
  res.setHeader("Content-Disposition", "attachment; filename=calendar.ics")
  return res
}

const app = express()

app.use((req, res, next) => {
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress
  if (req.headers["user-agent"] !== "com.snwfdhmp.healthcheck") {
    console.log(
      `${ip.padEnd(15)} ${req.method} ${req.url} ${JSON.stringify(req.query)}`
    )
  }
  next()
})

app.use((req, res, next) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "*")
  res.setHeader("Access-Control-Allow-Headers", "*")
  next()
})

app.get("/", (req, res) => {
  res.redirect("https://esports-calendar.snwfdhmp.com/")
})

const cachedRouter = express.Router()

cachedRouter.use(async (req, res, next) => {
  const clientIp =
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    "unknown-ip"

  const isFromAdmin = req.query.is_from_admin === "true"
  const isFromPreset = req.query.is_from_preset === "true"

  let telemetryId: number
  if (!isFromPreset) {
    telemetryId = await insertTelemetry({
      request: req.originalUrl,
      ip: clientIp,
      from_cache: false,
      spent_ms: 0,
      is_from_admin: isFromAdmin,
    })
  }
  req.telemetryId = telemetryId
  req.timeStart = Date.now()

  res.sendResponse = res.send
  res.send = (body: string) => {
    if (!isFromPreset) {
      updateTelemetry(req.telemetryId, {
        http_status: res.statusCode,
        from_cache: false,
        spent_ms: Date.now() - req.timeStart,
      })
    }
    res.sendResponse(body)
  }
  next()
})

type TelemetryRequest = express.Request & {
  telemetryId: number
  timeStart: number
}

cachedRouter.get("/preset/:name", async (req: TelemetryRequest, res) => {
  if (!presets[req.params.name]) {
    res.status(404).send("Preset not found")
    return
  }

  let presetUrls = presets[req.params.name]

  let ics = ""
  for (const presetUrl of presetUrls) {
    try {
      const url = new URL(presetUrl)
      url.searchParams.set("is_from_admin", req.query.is_from_admin as string)
      url.searchParams.set("is_from_preset", "true")
      const result = await axios.get(url.toString())
      ics = mergeIcs(ics, result.data)
    } catch (error) {
      console.error(`Error while fetching preset ${presetUrl}: ${error}`)
    }
  }

  res = setHeadersForIcs(res)
  res.send(ics)
})

/**
 * Get the options from the query parameters and prefix them if needed
 *
 * Prefix allows to handle multiple jobs in the same request by using different indexes
 */
const getOptsFromQuery = (
  req: express.Request,
  prefix: string = ""
): ParserOptions => {
  const from = {
    url: "url",
    competitionRegex: "competition_regex",
    teamsRegex: "teams_regex",
    teamsRegexUseFullnames: "teams_regex_use_fullnames",
    conditionIsOr: "condition_is_or",
    ignoreTbd: "ignore_tbd",
    shouldVerbose: "verbose",
    matchBothTeams: "match_both_teams",
    pastMatchAllowSeconds: "past_match_allow_seconds",
    expectMissingTeams: "expect_missing_teams",
  }

  const opts: ParserOptions = {}
  for (const [key, value] of Object.entries(from)) {
    opts[key] = req.query[prefix + value]
  }

  if (typeof opts.conditionIsOr === "string") {
    opts.conditionIsOr = opts.conditionIsOr === "true"
  } else {
    opts.conditionIsOr = false
  }
  return opts
}

/**
 * Validate the options
 */
const validateOpts = (opts: ParserOptions): Error | null => {
  if (!opts.url) {
    return new Error("Missing url query param")
  }
  if (!opts.url.startsWith("https://liquipedia.net/")) {
    return new Error("Use a URL starting with https://liquipedia.net/")
  }
  return null
}

/**
 * Find the prefixes configured by the user in the query parameters
 */
const listPrefixes = (req: express.Request): string[] => {
  const prefixes = []
  if (req.query.url) {
    prefixes.push("")
  }

  // test 0 to prevent different user start-index to fail (some use 0, some use 1)
  if (req.query["0_url"]) {
    prefixes.push("0_")
  }
  let urlCount = 1
  while (req.query[`${urlCount}_url`]) {
    prefixes.push(`${urlCount}_`)
    urlCount++
  }
  return prefixes
}

/**
 * Tries to find the supported game for a given URL
 *
 * It suggest autofix candidates for users that have trouble understanding that they cannot use URLS /mygame/myAwesomeTournament/anything.html
 *
 * It will provides the supported game URL while the main flow will first test the user URL (in case its valid), and then fallback to those reported here
 */
const getUrlCandidates = (url: string): string[] => {
  const candidates = [url]

  const supportedGame = supportedGames.find((game) =>
    url.startsWith(game.baseUrl)
  )
  if (supportedGame) {
    candidates.push(supportedGame.url)
  }
  return candidates
}

cachedRouter.get("/matches.ics", async (req, res) => {
  let optOutputFormat: "ics" | "json" = "ics"
  if (req.query.output_format === "json") {
    optOutputFormat = "json"
  }

  try {
    const prefixes = listPrefixes(req)

    const totalEvents: EventData[] = []
    for (const prefix of prefixes) {
      const opts = getOptsFromQuery(req, prefix)
      const validationError = validateOpts(opts)
      if (validationError) {
        res.status(400).send(validationError.message)
        return
      }
      let urlCandidates: string[] = getUrlCandidates(opts.url)

      let hadSuccess = false
      for (const urlCandidate of urlCandidates) {
        try {
          const events = await fetchMatches(urlCandidate, opts)
          totalEvents.push(...events)
          hadSuccess = true
          break
        } catch (error) {
          // if we can't parse any matches from this URL, try the next one
          continue
        }
      }

      if (!hadSuccess) {
        res
          .status(400)
          .send(
            `Could not retrieve matches for '${opts.url}', most probably because the URL is not a Liquipedia match page. Example valid URL: https://liquipedia.net/rocketleague/Liquipedia:Matches`
          )
        return
      }
    }

    const uniqueEvents = totalEvents.filter(
      (event, index, self) =>
        index === self.findIndex((t) => t.uid === event.uid)
    )

    if (!req.query.is_from_preset) {
      req.uniqueEventsCount = uniqueEvents.length
      await updateTelemetry(req.telemetryId, {
        matches_count: req.uniqueEventsCount,
      })
    }

    if (optOutputFormat === "ics") {
      res = setHeadersForIcs(res)
      res.send(buildCalendar(uniqueEvents))
    } else {
      console.log("Defaulting to JSON output")
      res.send(JSON.stringify(uniqueEvents))
    }
  } catch (error) {
    res.status(500).send("Could not retrieve matches")
  }
})

app.use(cachedRouter)

export default app
