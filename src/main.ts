// Import des modules nécessaires
import axios from "axios"
import express from "express"
import { insertTelemetry, updateTelemetry } from "./telemetry.js"
import { presets } from "./presets.js"
import { fetchMatches } from "./fetch.js"
import { getCache, setCache } from "./cache.js"
import { buildCalendar, mergeIcs } from "./ics.js"
import { test } from "./test.js"

const __dirname = new URL(".", import.meta.url).pathname

const setHeadersForIcs = (res) => {
  res.setHeader("Content-Type", "text/calendar; charset=utf-8")
  res.setHeader("Content-Disposition", "attachment; filename=calendar.ics")
  return res
}

// todo: store events and set DTSTAMP when event discovered/updated
// const cal = buildCalendar(await fetchMatches())
// console.log(cal)
// fs.writeFileSync("rocket.ics", cal)

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
  res.sendFile(__dirname + "/url_builder.html")
})

app.get("/favicon.ico", (req, res) => {
  res.sendFile(__dirname + "/favicon.ico")
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

  const cached = await getCache(req.originalUrl)
  if (cached) {
    if (!isFromPreset) {
      const inCacheMatchesCount = cached.match(/BEGIN:VEVENT/g)?.length || 0
      await updateTelemetry(telemetryId, {
        http_status: 200,
        from_cache: true,
        spent_ms: Date.now() - req.timeStart,
        matches_count: inCacheMatchesCount,
      })
    }
    console.log(`Serving cached response for ${req.originalUrl}`)
    res.send(cached)
    return
  }
  res.sendResponse = res.send
  res.send = (body) => {
    if (res.statusCode === 200) {
      console.log(`Caching response for ${req.originalUrl}`)
      setCache(req.originalUrl, body)
    } else {
      console.log(`Not caching response for ${req.originalUrl}`)
    }
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

const validateOpts = (opts: ParserOptions): Error | null => {
  if (!opts.url) {
    return new Error("Missing url query param")
  }
  if (!opts.url.startsWith("https://liquipedia.net/")) {
    return new Error("Use a URL starting with https://liquipedia.net/")
  }
  return null
}

const listPrefixes = (req: express.Request): string[] => {
  const prefixes = []
  if (req.query.url) {
    prefixes.push("")
  }
  let urlCount = 1
  while (req.query[`${urlCount}_url`]) {
    prefixes.push(`${urlCount}_`)
    urlCount++
  }
  return prefixes
}

cachedRouter.get("/matches.ics", async (req, res) => {
  try {
    const prefixes = listPrefixes(req)

    let ics = ""
    req.uniqueEventsCount = 0
    for (const prefix of prefixes) {
      const opts = getOptsFromQuery(req, prefix)
      const validationError = validateOpts(opts)
      if (validationError) {
        res.status(400).send(validationError.message)
        return
      }
      const uniqueEvents = await fetchMatches(opts.url, opts)
      req.uniqueEventsCount += uniqueEvents.length
      const currentIcs = buildCalendar(uniqueEvents)
      if (!ics) {
        ics = currentIcs
      } else {
        ics = mergeIcs(ics, currentIcs)
      }
    }

    if (!req.query.is_from_preset) {
      await updateTelemetry(req.telemetryId, {
        matches_count: req.uniqueEventsCount,
      })
    }
    res = setHeadersForIcs(res)
    res.send(ics)
  } catch (error) {
    res.status(500).send("Could not retrieve matches")
  }
})

app.use(cachedRouter)

if (process.argv[2] === "test") {
  await test({
    limitTestsTo: process.argv.slice(3),
  })
} else {
  const PORT = process.env.PORT || 9059
  app.listen(PORT, () => {
    console.log(`Server started on 0.0.0.0:${PORT}`)
  })
}
