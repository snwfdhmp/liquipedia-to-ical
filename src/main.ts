// Import des modules nécessaires
import axios from "axios"
import express from "express"
import { insertTelemetry, updateTelemetry } from "./telemetry.js"
import { presets } from "./presets.js"
import { fetchMatches } from "./fetch.js"
import { getCache, setCache } from "./cache.js"
import { buildCalendar, mergeIcs } from "./ics.js"

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
    updateTelemetry(req.telemetryId, {
      http_status: res.statusCode,
      from_cache: false,
      spent_ms: Date.now() - req.timeStart,
    })
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
  if (!Array.isArray(presetUrls)) {
    presetUrls = [presetUrls]
  }

  let ics = ""
  for (const presetUrl of presetUrls) {
    try {
      const result = await axios.get(
        presetUrl +
          `&is_from_admin=${req.query.is_from_admin}&is_from_preset=true`
      )
      ics = mergeIcs(ics, result.data)
    } catch (error) {
      console.error(`Error while fetching preset ${presetUrl}: ${error}`)
    }
  }

  res = setHeadersForIcs(res)
  res.send(ics)
})

cachedRouter.get("/matches.ics", async (req, res) => {
  // read url, competition_regex and teams_regex from query params
  let {
    url,
    competition_regex: competitionRegex,
    teams_regex: teamsRegex,
    teams_regex_use_fullnames: teamsRegexUseFullnames,
    condition_is_or: conditionIsOr,
    ignore_tbd: ignoreTbd,
    verbose: shouldVerbose,
    match_both_teams: matchBothTeams,
    past_match_allow_seconds: pastMatchAllowSeconds,
    expect_missing_teams: expectMissingTeams,
  } = req.query

  if (typeof conditionIsOr === "string") {
    conditionIsOr = conditionIsOr === "true"
  } else {
    conditionIsOr = false
  }

  if (!url) {
    res.status(400).send("Missing url query param")
    return
  }

  if (!url.startsWith("https://liquipedia.net/")) {
    res.status(403).send("Use liquipedia URL")
    return
  }

  try {
    const uniqueEvents = await fetchMatches(url, {
      competitionRegex,
      teamsRegex,
      teamsRegexUseFullnames,
      conditionIsOr,
      ignoreTbd,
      shouldVerbose,
      matchBothTeams,
      pastMatchAllowSeconds,
      expectMissingTeams,
    })
    req.uniqueEventsCount = uniqueEvents.length
    const ics = buildCalendar(uniqueEvents)
    res = setHeadersForIcs(res)
    if (!req.query.is_from_preset) {
      await updateTelemetry(req.telemetryId, {
        matches_count: uniqueEvents.length,
      })
    }
    res.send(ics)
  } catch (error) {
    res.status(500).send("Could not retrieve matches")
  }
})

app.use(cachedRouter)

if (process.argv[2] === "try") {
  const testCases = [
    {
      url: "https://liquipedia.net/leagueoflegends/Liquipedia:Matches",
      opts: {
        teamsRegex: "KOI",
      },
    },
    {
      url: "https://liquipedia.net/rocketleague/Liquipedia:Matches",
      opts: {},
    },
  ]
  for (const testCase of testCases) {
    const ics = buildCalendar(await fetchMatches(testCase.url, testCase.opts))
    console.log(ics)
  }
} else if (process.argv[2] === "test") {
  let testCases = [
    {
      name: "League of Legends",
      url: "https://liquipedia.net/leagueoflegends/Liquipedia:Matches",
      opts: {},
    },
    {
      name: "Rocket League",
      url: "https://liquipedia.net/rocketleague/Liquipedia:Matches",
      opts: {},
    },
    {
      name: "Counter-Strike",
      url: "https://liquipedia.net/counterstrike/Liquipedia:Matches",
      opts: {},
    },
    {
      name: "Trackmania",
      url: "https://liquipedia.net/trackmania/Liquipedia:Matches",
      opts: {},
    },
    {
      name: "Starcraft 2",
      url: "https://liquipedia.net/starcraft2/Liquipedia:Upcoming_and_ongoing_matches",
      opts: {},
    },
    {
      name: "VALORANT",
      url: "https://liquipedia.net/valorant/Liquipedia:Matches",
      opts: {},
    },
    {
      name: "Dota 2",
      url: "https://liquipedia.net/dota2/Liquipedia:Matches",
      opts: {},
    },
    {
      name: "Overwatch",
      url: "https://liquipedia.net/overwatch/Liquipedia:Upcoming_and_ongoing_matches",
      opts: {},
    },
    {
      name: "Mobile Legends",
      url: "https://liquipedia.net/mobilelegends/Liquipedia:Matches",
      opts: {},
    },
    {
      name: "Rainbow Six",
      url: "https://liquipedia.net/rainbowsix/Liquipedia:Matches",
      opts: {},
    },
    {
      name: "Age of Empires",
      url: "https://liquipedia.net/ageofempires/Liquipedia:Upcoming_and_ongoing_matches",
      opts: {},
    },
    {
      name: "Brawl Stars",
      url: "https://liquipedia.net/brawlstars/Liquipedia:Upcoming_and_ongoing_matches",
      opts: {},
    },
    {
      name: "EA Sports FC",
      url: "https://liquipedia.net/easportsfc/Liquipedia:Matches",
      opts: {},
    },
    {
      name: "Wild Rift",
      url: "https://liquipedia.net/wildrift/Liquipedia:Matches",
      opts: {},
    },
    {
      name: "Heroes of the Storm",
      url: "https://liquipedia.net/heroes/Liquipedia:Matches",
      opts: {},
    },
    {
      name: "Warcraft",
      url: "https://liquipedia.net/warcraft/Liquipedia:Matches",
      opts: {},
    },
    {
      name: "Hearthstone",
      url: "https://liquipedia.net/hearthstone/Liquipedia:Matches",
      opts: {},
    },
    {
      name: "PUBG",
      url: "https://liquipedia.net/pubgmobile/Liquipedia:Matches",
      opts: {
        expectMissingTeams: true,
      },
    },
    {
      name: "Apex Legends",
      url: "https://liquipedia.net/apexlegends/Liquipedia:Matches",
      opts: {
        expectMissingTeams: true,
      },
    },
  ]

  const results = {}

  const filteredTests = process.argv.slice(3)
  if (filteredTests.length > 0) {
    testCases = testCases.filter((testCase) =>
      filteredTests.includes(testCase.name)
    )
  }
  for (const testCase of testCases) {
    const ics = buildCalendar(
      await fetchMatches(testCase.url, {
        ...testCase.opts,
        shouldVerbose: true,
        pastMatchAllowSeconds: 1000 * 60 * 60 * 24 * 30,
      })
    )
    results[testCase.name] = ics.match(/BEGIN:VEVENT/g)?.length
  }
  for (const [name, count] of Object.entries(results)) {
    console.log(`${name}: ${count} events`)
  }
} else {
  const PORT = process.env.PORT || 9059
  app.listen(PORT, () => {
    console.log(`Server started on 0.0.0.0:${PORT}`)
  })
}
