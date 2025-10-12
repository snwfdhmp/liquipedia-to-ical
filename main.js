// Import des modules nécessaires
import axios from "axios"
import * as cheerio from "cheerio"
import express from "express"
import fs from "fs"
import crypto from "crypto"

const cache = {}
const CACHE_TIMEOUT_MS = 1000 * 299
const getCache = async (hash) => {
  if (cache[hash] && cache[hash].expiresAt > Date.now()) {
    return cache[hash].data
  }
  return null
}
const setCache = async (hash, data) => {
  cache[hash] = {
    data,
    expiresAt: Date.now() + CACHE_TIMEOUT_MS,
  }
}

const competitionMatches = (event, regex) => {
  const regexExtended = new RegExp(regex, "i")
  if (!event.competition.match(regexExtended)) return false
  return true
}

const teamsMatches = (event, regex, matchBothTeams) => {
  const regexExtended = new RegExp(regex, "i")
  if (!event.team1.match(regexExtended) && !event.team2.match(regexExtended)) {
    return false
  }
  if (matchBothTeams) {
    if (!event.team1.match(regexExtended) || !event.team2.match(regexExtended))
      return false
  }
  return true
}

const teamsFullnameMatches = (event, regex, matchBothTeams) => {
  const regexExtended = new RegExp(regex, "i")
  if (!event.team1fullName || !event.team2fullName) return false
  if (
    !event.team1fullName.match(regexExtended) &&
    !event.team2fullName.match(regexExtended)
  )
    return false
  if (matchBothTeams) {
    if (
      !event.team1fullName.match(regexExtended) ||
      !event.team2fullName.match(regexExtended)
    )
      return false
  }
  return true
}

const verbose = (shouldVerbose, data) => {
  if (shouldVerbose) console.log(data)
}

const tryMultipleSelectors = (findFunc, selectors, shouldVerbose) => {
  for (const selector of selectors) {
    const elements = findFunc(selector)
    // verbose(shouldVerbose, `SELECTOR: ${selector}`)
    // verbose(shouldVerbose, `ELEMENTS: ${elements}`)
    if (elements?.length > 0) return elements
  }
  return null
}

// Fonction pour récupérer les matchs à venir de Rocket League
async function fetchMatches(url, opts) {
  const {
    competitionRegex = ``,
    teamsRegex = ``,
    teamsRegexUseFullnames = false,
    conditionIsOr = false,
    matchBothTeams = false,
    ignoreTbd = false,
    shouldVerbose = false,
    pastMatchAllowSeconds = 3600 * 2,
  } = opts || {}
  verbose(shouldVerbose, `Fetching matches from ${url}`)
  try {
    const events = []

    const $ = cheerio.load((await axios.get(url)).data)

    // the different selectors to try, depends on page layout
    const matchSelectorsToTry = [".wikitable", ".match", ".match-info"]
    let elements =
      tryMultipleSelectors($, matchSelectorsToTry, shouldVerbose) || []
    if (!elements) elements = []

    // ================ FOR EACH MATCH ================
    elements.each((index, element) => {
      verbose(shouldVerbose, `ELEMENT TEXT: ${$(element).text()}`)

      // ================ DATE ================
      const dateTimestamp = parseInt(
        $(element).find(".timer-object").attr("data-timestamp"),
      )
      verbose(shouldVerbose, `DATE TIMESTAMP: ${dateTimestamp}`)
      if (dateTimestamp < Date.now() / 1000 - pastMatchAllowSeconds) {
        verbose(
          shouldVerbose,
          `Ignoring match too old: ${dateTimestamp}\n` +
            `Date as ISO UTC: ${new Date(dateTimestamp * 1000).toISOString()}`,
        )
        return
      }

      // ================ TEAM NAMES ================
      let team1 = tryMultipleSelectors(
        (selector) => $(element).find(selector),
        [
          ".team-left span.team-template-text",
          ".match-info-header > div:nth-child(1)",
        ],
        shouldVerbose,
      )
        ?.text()
        .trim()
      verbose(shouldVerbose, `TEAM 1: ${team1}`)
      let team2 = tryMultipleSelectors(
        (selector) => $(element).find(selector),
        [
          ".team-right span.team-template-text",
          ".match-info-header > div:nth-child(3)",
        ],
        shouldVerbose,
      )
        ?.text()
        .trim()
      verbose(shouldVerbose, `TEAM 2: ${team2}`)

      let team1fullName
      let team2fullName
      try {
        team1fullName =
          $(element).find(".team-left span").attr("data-highlightingclass") ||
          null
        team2fullName =
          $(element).find(".team-right span").attr("data-highlightingclass") ||
          null
      } catch {}
      let team1Logo
      let team2Logo
      try {
        const team1ImgElement = $(element).find(
          ".team-left .team-template-darkmode img",
        )
        const team2ImgElement = $(element).find(
          ".team-right .team-template-darkmode img",
        )

        const searchImgInElement = (imgElement) => {
          const imgList = [
            imgElement.attr("src"),
            ...imgElement
              .attr("srcset")
              ?.split(", ")
              ?.map((src) => src?.split(" ")?.[0]),
          ]
          let bestImg = imgList?.[imgList.length - 1]
          if (!bestImg) return null

          if (bestImg.startsWith("/")) {
            bestImg = "https://liquipedia.net" + bestImg
          }
          return bestImg
        }

        team1Logo = searchImgInElement(team1ImgElement)
        team2Logo = searchImgInElement(team2ImgElement)
      } catch {}

      let team1Url
      let team2Url
      try {
        team1Url = $(element)
          .find(".team-left .team-template-darkmode a")
          .attr("href")

        if (team1Url && team1Url.startsWith("/")) {
          team1Url = "https://liquipedia.net" + team1Url
          if (team1Url.includes("redlink=1")) {
            team1Url = null
          }
        }
        team2Url = $(element)
          .find(".team-right .team-template-darkmode a")
          .attr("href")

        if (team2Url && team2Url.startsWith("/")) {
          team2Url = "https://liquipedia.net" + team2Url
          if (team2Url.includes("redlink=1")) {
            team2Url = null
          }
        }
      } catch {}

      if (!team1 || !team2) {
        verbose(shouldVerbose, "Ignoring match with missing teams")
        return
      }
      if (ignoreTbd && team1 === "TBD" && team2 === "TBD") {
        verbose(shouldVerbose, "Ignoring match with TBD team")
        return
      }
      if (team1 === "TBD") team1 = "???"
      if (team2 === "TBD") team2 = "???"
      if (team1fullName === "TBD") team1fullName = "??? (to be determined)"
      if (team2fullName === "TBD") team2fullName = "??? (to be determined)"

      // ================ MATCH DESCRIPTORS ================
      // OLD WAY OF OBTAINING COMPETITION, DOES NOT WORK FOR ALL GAMES
      // const competition = $(element)
      //   .find(".match-filler tbody tr td:nth-child(2)")
      //   .text()
      //   .trim()
      let competition = $(element).find(".match-filler")
      if (competition.length !== 0) {
        competition.find(".match-countdown").remove()
        competition = competition.text().trim()
      } else {
        competition = $(element).find(".match-tournament").text().trim()
      }
      let descriptor
      let descriptorMoreInfo
      try {
        const versus = $(element).find(".versus")
        if (
          // has score
          $(versus)
            .text()
            .trim()
            .match(/[0-9]+\:[0-9]+/)
        ) {
          descriptor = $(versus).text().trim()
        } else {
          descriptor =
            $(element).find(".versus abbr").text() ||
            $(element).find(".versus abbr").html() ||
            $(element).find(".versus abbr").attr("title") ||
            null
          descriptorMoreInfo =
            $(element).find(".versus abbr").attr("title") || null
        }
      } catch {}

      let hasWinner = false
      let winnerSide = ""
      try {
        const winnerLeft = $(element).hasClass("winner-left")
        if (winnerLeft) {
          hasWinner = true
          winnerSide = "left"
        }
        const winnerRight = $(element).hasClass("winner-right")
        if (winnerRight) {
          hasWinner = true
          winnerSide = "right"
        }
        console.log({ hasWinner, winnerSide, winnerLeft, winnerRight })
      } catch (e) {
        console.log(`Error while checking for winner: ${e}`)
      }

      // ================ COMPILE EVENT DATA ================
      let summary =
        `${team1} vs ${team2} ` +
        (descriptor && dateTimestamp > Date.now() / 1000
          ? `(${descriptor}) `
          : "") +
        `[${competition}]`

      let description = `${team1fullName || team1} vs ${
        team2fullName || team2
      } ${
        descriptor ? "(" + (descriptorMoreInfo || descriptor || "") + ") " : ""
      }[${competition}]`

      const eventData = {
        uid:
          `${competition.replace(
            /[^a-zA-Z0-9\-]/g,
            "",
          )}/${dateTimestamp}/${team1}/${team2}` +
          "@liquipedia-calendar.snwfdhmp.com",
        dateTimestamp,
        team1,
        team2,
        team1fullName,
        team2fullName,
        team1Logo,
        team2Logo,
        competition,
        summary,
        description,
        winnerSide,
        descriptor,
        descriptorMoreInfo,
        team1Url,
        team2Url,
      }

      // ================ CHECK IF EVENT SHOULD BE SELECTED ================
      const competitionOk = competitionMatches(eventData, competitionRegex)
      const teamsOk = teamsRegexUseFullnames
        ? teamsFullnameMatches(eventData, teamsRegex, matchBothTeams)
        : teamsMatches(eventData, teamsRegex, matchBothTeams)

      let shouldBeSelected = false
      if (conditionIsOr) {
        shouldBeSelected = competitionOk || teamsOk
      } else {
        shouldBeSelected = competitionOk && teamsOk
      }
      verbose(shouldVerbose, {
        competition,
        competitionOk,
        team1,
        team2,
        teamsOk,
        conditionIsOr,
        shouldBeSelected,
      })

      if (!shouldBeSelected) {
        verbose(shouldVerbose, `Ignoring match: ${JSON.stringify(eventData)}`)
        return
      }
      events.push(eventData)
      if (shouldVerbose) console.log({ eventData })
    })

    // ================ FILTER UNIQUE EVENTS ================
    const uniqueEvents = []
    const uids = new Set()
    for (const event of events) {
      if (uids.has(event.uid)) continue
      uids.add(event.uid)
      uniqueEvents.push(event)
    }

    console.log(
      `${
        uniqueEvents.length
      } matches returned from ${url}\tcompetition_regex=${competitionRegex}\tteams_regex=${teamsRegex}\t${Object.entries(
        opts,
      )
        .map(([key, value]) => `${key}=${value}`)
        .join("\t")}`,
    )

    return uniqueEvents
  } catch (error) {
    console.error("Erreur lors de la récupération des matchs:", error)
    throw error
  }
}

const timestampToIcs = (timestamp) => {
  const date = new Date(timestamp * 1000)

  // produce YYYYMMDD
  const datePart = date.toISOString().split("T")[0].replace(/-/g, "")

  // produce HHmmss
  const timePart = date
    .toISOString()
    .split("T")[1]
    .replace(/:/g, "")
    .replace(/\.[0-9]+/, "")

  // desiredFormat: YYYYMMDDTHHmmssZ
  return `${datePart}T${timePart}`
}

const buildCalendar = (events) => {
  const optionalData = {
    "X-LIQUIPEDIATOICAL-COMPETITION": "competition",
    "X-LIQUIPEDIATOICAL-TEAMLEFT": "team1",
    "X-LIQUIPEDIATOICAL-TEAMLEFTFULLNAME": "team1fullName",
    "X-LIQUIPEDIATOICAL-TEAMLEFTURL": "team1Url",
    "X-LIQUIPEDIATOICAL-TEAMLEFTLOGO": "team1Logo",
    "X-LIQUIPEDIATOICAL-TEAMRIGHT": "team2",
    "X-LIQUIPEDIATOICAL-TEAMRIGHTFULLNAME": "team2fullName",
    "X-LIQUIPEDIATOICAL-TEAMRIGHTURL": "team2Url",
    "X-LIQUIPEDIATOICAL-TEAMRIGHTLOGO": "team2Logo",
    "X-LIQUIPEDIATOICAL-WINNERSIDE": "winnerSide",
    "X-LIQUIPEDIATOICAL-DESCRIPTOR": "descriptor",
    "X-LIQUIPEDIATOICAL-DESCRIPTORMOREINFO": "descriptorMoreInfo",
  }

  const body = events
    .map((event) =>
      [
        `BEGIN:VEVENT`,
        `UID:${event.uid}`,
        `LOCATION:${event.competition}`,
        `DTSTAMP:${timestampToIcs(event.dateTimestamp)}`,
        `DTSTART:${timestampToIcs(event.dateTimestamp)}`,
        `DURATION:PT40M`,
        `DESCRIPTION:${event.description.split("\n").join("\\n")}`,
        `SUMMARY:${event.summary}`,
        ...Object.entries(optionalData)
          .map(([key, value]) =>
            event[value] ? [`${key}:${event[value]}`] : null,
          )
          .filter(Boolean),
        `END:VEVENT`,
      ].join("\n"),
    )
    .join("\n\n")

  return wrapIcs(body)
}

const logClient = async (ip, payload, headers) => {
  // store {lastSeenAt, payload} in ./logs/clients/${payloadHash..8}.ip.json
  const basePath = `${import.meta.dirname}/logs/clients/`
  try {
    await fs.promises.mkdir(basePath, { recursive: true })
    const payloadHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex")
    const payloadHashShort = payloadHash.substr(0, 8)
    const logPath = `${basePath}/${payloadHashShort}.${ip}.json`
    const log = {
      lastSeenAt: new Date().toISOString(),
      payload,
      headers,
    }
    await fs.promises.writeFile(logPath, JSON.stringify(log, null, 2))
  } catch (error) {
    console.error(`Error while logging client: ${error}`)
  }
}

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
// log requests
app.use((req, res, next) => {
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress
  if (req.headers["user-agent"] !== "com.snwfdhmp.healthcheck") {
    console.log(
      `${ip.padEnd(15)} ${req.method} ${req.url} ${JSON.stringify(req.query)}`,
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

const getDirname = () => {
  return import.meta.url
    .replace("file://", "")
    .split("/")
    .slice(0, -1)
    .join("/")
}

app.get("/", (req, res) => {
  const __dirname = getDirname()
  res.sendFile(__dirname + "/url_builder.html")
})

app.get("/favicon.ico", (req, res) => {
  const __dirname = getDirname()
  res.sendFile(__dirname + "/favicon.ico")
})

const cachedRouter = express.Router()

cachedRouter.use(async (req, res, next) => {
  const cached = await getCache(req.originalUrl)
  if (cached) {
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
    res.sendResponse(body)
  }
  next()
})

cachedRouter.get("/preset/:name", async (req, res) => {
  const presets = {
    rocketbets: [
      "https://ics.snwfdhmp.com/matches.ics?url=https%3A%2F%2Fliquipedia.net%2Frocketleague%2FLiquipedia%3AMatches&competition_regex=RLCS&past_match_allow_seconds=2592000",
    ],
    rlcs: [
      "https://ics.snwfdhmp.com/matches.ics?url=https%3A%2F%2Fliquipedia.net%2Frocketleague%2FLiquipedia%3AMatches&competition_regex=RLCS",
    ],
    "rlcs-worlds": [
      "https://ics.snwfdhmp.com/matches.ics?url=https%3A%2F%2Fliquipedia.net%2Frocketleague%2FLiquipedia%3AMatches&competition_regex=RLCS.*Worlds",
    ],
    "rlcs-major": [
      "https://ics.snwfdhmp.com/matches.ics?url=https%3A%2F%2Fliquipedia.net%2Frocketleague%2FLiquipedia%3AMatches&competition_regex=RLCS.*Major",
    ],
    "rlcs-fifae": [
      "https://ics.snwfdhmp.com/matches.ics?url=https%3A%2F%2Fliquipedia.net%2Frocketleague%2FLiquipedia%3AMatches&competition_regex=FIFA",
    ],
    "rlcs-enjoyer": [
      "https://ics.snwfdhmp.com/preset/rlcs-major",
      "https://ics.snwfdhmp.com/preset/rlcs-worlds",
      "https://ics.snwfdhmp.com/preset/rlcs-fifae",
      "https://ics.snwfdhmp.com/preset/rlcs-match-s-tier",
    ],
    "rlcs-match-s-tier": [
      "https://ics.snwfdhmp.com/matches.ics?url=https%3A%2F%2Fliquipedia.net%2Frocketleague%2FLiquipedia%3AMatches&teams_regex=%5E%28KC%7CVIT%7CFUR%7CFLCN%7CM8%7CNRG%7CTWIS%7CTS%29%24&match_both_teams=true",
    ],
    "rocket-league": "https://ics.snwfdhmp.com/preset/rlcs",
  }

  // redirect to preset if exists
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
    const result = await axios.get(presetUrl)
    ics = mergeIcs(ics, result.data)
  }

  // res.redirect(presets[req.params.name])
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
  } = req.query

  logClient(
    req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown-ip",
    req.query,
    req.headers,
  )

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
    const ics = buildCalendar(
      await fetchMatches(url, {
        competitionRegex,
        teamsRegex,
        teamsRegexUseFullnames,
        conditionIsOr,
        ignoreTbd,
        shouldVerbose,
        matchBothTeams,
        pastMatchAllowSeconds,
      }),
    )
    res = setHeadersForIcs(res)
    res.send(ics)
  } catch (error) {
    res.status(500).send("Erreur lors de la récupération des matchs")
  }
})

const icsWrappers = {
  before: [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//com.snwfdhmp.liquipedia-calendar//NONSGML v1.0//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ],
  after: ["END:VCALENDAR"],
}

const wrapIcs = (ics) => {
  return [...icsWrappers.before, ics, ...icsWrappers.after].join("\n")
}

const unwrapIcs = (ics) => {
  const lines = ics.split("\n")
  const filteredLines = lines.filter(
    (line) =>
      ![
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//com.snwfdhmp.liquipedia-calendar//NONSGML v1.0//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "END:VCALENDAR",
      ].includes(line),
  )
  return filteredLines.join("\n").trim()
}

const mergeIcs = (ics1, ics2) => {
  const mergedIcs = wrapIcs([unwrapIcs(ics1), unwrapIcs(ics2)].join("\n"))
  // remove duplicates

  const events = mergedIcs.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g)
  if (!events) return wrapIcs(mergedIcs)

  const uids = new Set()
  const uniqueEvents = events.filter((event) => {
    const uid = event.match(/UID:(.*)/)[1]
    if (uids.has(uid)) {
      console.log(`Ignoring duplicate event with UID: ${uid}`)
      return false
    }
    uids.add(uid)
    return true
  })

  return wrapIcs(uniqueEvents.join("\n\n"))
}

app.use(cachedRouter)

if (process.argv[2] === "test") {
  const ics = buildCalendar(
    await fetchMatches(
      "https://liquipedia.net/rocketleague/Liquipedia:Matches",
      {
        competitionRegex: "RLCS.*Major",
      },
    ),
  )
  console.log(ics)
} else {
  const PORT = process.env.PORT || 9059
  app.listen(PORT, () => {
    console.log(`Server started on 0.0.0.0:${PORT}`)
  })
}
