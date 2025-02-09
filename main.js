// Import des modules nécessaires
import axios from "axios"
import * as cheerio from "cheerio"
import express from "express"
import fs from "fs"
import crypto from "crypto"

let VERBOSE = true

// if -q is passed, disable verbose
if (process.argv.includes("-q")) VERBOSE = false

// URL à fetch
// const url = "https://liquipedia.net/rocketleague/Liquipedia:Matches"

// const inputCompetitionRegex = "^RLCS"
const competitionMatches = (event, regex) => {
  if (!event.competition.match(regex)) return false
  return true
}

// const inputTeamsMatches = "^(KC|M8|VIT)$"
// const inputTeamsMatches = ""
const teamsMatches = (event, regex, matchBothTeams) => {
  if (!event.team1.match(regex) && !event.team2.match(regex)) return false
  if (matchBothTeams) {
    if (!event.team1.match(regex) || !event.team2.match(regex)) return false
  }
  return true
}

const teamsFullnameMatches = (event, regex, matchBothTeams) => {
  if (!event.team1fullName || !event.team2fullName) return false
  if (!event.team1fullName.match(regex) && !event.team2fullName.match(regex))
    return false
  if (matchBothTeams) {
    if (!event.team1fullName.match(regex) || !event.team2fullName.match(regex))
      return false
  }
  return true
}

const logOnlyVerbose = (verbose, data) => {
  if (verbose) console.log(data)
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
  } = opts || {}
  logOnlyVerbose(shouldVerbose, `Fetching matches from ${url}`)
  try {
    // Fetch de la page
    const response = await axios.get(url)

    // Charger la réponse HTML dans cheerio
    const $ = cheerio.load(response.data)

    // Tableau pour stocker les événements
    const events = []

    // test if element exists
    const containerSelectorsToTry = [
      // ".matches-list div:nth-child(2) div:nth-child(2) .infobox_matches_content",
      // first parent of .infobox_matches_content
      ".wikitable",
    ]

    let elements = null
    for (const selector of containerSelectorsToTry) {
      elements = $(selector)
      if (elements.length > 0) break
    }

    // Sélection des éléments du tableau de matchs
    elements.each((index, element) => {
      // if (shouldVerbose) {
      //   console.log(`ELEMENT TEXT: ${$(element).text()}`)
      // }
      // Récupération des dates, équipes et nom de la compétition
      const dateTimestamp = parseInt(
        $(element).find(".timer-object").attr("data-timestamp"),
      )

      if (dateTimestamp < Date.now() / 1000 - 3600 * 2) {
        // if (shouldVerbose) console.log("Ignoring match too old")
        return
      }
      let team1 =
        $(element).find(".team-left span.team-template-text").text().trim() ||
        $(element).find(".team-left").text().trim()
      let team2 =
        $(element).find(".team-right span.team-template-text").text().trim() ||
        $(element).find(".team-right").text().trim()
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

      if (!team1 || !team2) {
        logOnlyVerbose(shouldVerbose, "Ignoring match with missing teams")
        return
      }

      if (ignoreTbd && team1 === "TBD" && team2 === "TBD") {
        logOnlyVerbose(shouldVerbose, "Ignoring match with TBD team")
        return
      }

      // OLD WAY OF OBTAINING COMPETITION, DOES NOT WORK FOR ALL GAMES
      // const competition = $(element)
      //   .find(".match-filler tbody tr td:nth-child(2)")
      //   .text()
      //   .trim()

      let competition = $(element).find(".match-filler")
      competition.find(".match-countdown").remove()
      competition = competition.text().trim()
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
      } catch (error) {
        // ignore missing competition subpart
      }

      if (team1 === "TBD") team1 = "???"
      if (team2 === "TBD") team2 = "???"
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
        competition,
        summary:
          `${team1} vs ${team2} ` +
          (descriptor ? `(${descriptor}) ` : "") +
          `[${competition}]`,
        description: `${team1fullName || team1} vs ${team2fullName || team2} ${
          descriptor
            ? "(" + (descriptorMoreInfo || descriptor || "") + ") "
            : ""
        }[${competition}]`,
      }

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

      logOnlyVerbose(shouldVerbose, {
        competition,
        competitionOk,
        team1,
        team2,
        teamsOk,
        conditionIsOr,
        shouldBeSelected,
      })

      const logMessage = `eventData=${JSON.stringify(
        eventData,
      )} opts=${JSON.stringify(opts)}`
      if (!shouldBeSelected) {
        logOnlyVerbose(shouldVerbose, `Ignoring match: ${logMessage}`)
        return
      }
      events.push(eventData)
      if (shouldVerbose) console.log({ eventData })
    })

    // display all opts as \t separated string
    console.log(
      `${
        events.length
      } matches returned from ${url}\tcompetition_regex=${competitionRegex}\tteams_regex=${teamsRegex}\t${Object.entries(
        opts,
      )
        .map(([key, value]) => `${key}=${value}`)
        .join("\t")}`,
    )

    // filter unique events
    const uniqueEvents = []
    const uids = new Set()
    for (const event of events) {
      if (uids.has(event.uid)) continue
      uids.add(event.uid)
      uniqueEvents.push(event)
    }

    return uniqueEvents
  } catch (error) {
    console.error("Erreur lors de la récupération des matchs:", error)
    throw error
  }
}

// desiredFormat: YYYYMMDD'T'HHmmss'Z'
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

  return `${datePart}T${timePart}`
}

const buildCalendar = (events) => {
  // events = events.slice(0, 2)

  const headers = `BEGIN:VCALENDAR
  VERSION:2.0
  PRODID:-//com.snwfdhmp.liquipedia-calendar//NONSGML v1.0//EN
  CALSCALE:GREGORIAN
  METHOD:PUBLISH`
    .split("\n")
    .map((line) => line.trim())
    .join("\n")

  const footers = `END:VCALENDAR`

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
        `END:VEVENT`,
      ].join("\n"),
    )
    .join("\n\n")

  return `${headers}\n\n${body}\n\n${footers}`
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
app.get("/", (req, res) => {
  const __dirname = import.meta.url
    .replace("file://", "")
    .split("/")
    .slice(0, -1)
    .join("/")
  res.sendFile(__dirname + "/url_builder.html")
})

app.get("/matches.ics", async (req, res) => {
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
      }),
    )
    res.setHeader("Content-Type", "text/calendar; charset=utf-8")
    res.setHeader("Content-Disposition", "attachment; filename=calendar.ics")
    res.send(ics)
  } catch (error) {
    res.status(500).send("Erreur lors de la récupération des matchs")
  }
})

const PORT = process.env.PORT || 9059
app.listen(PORT, () => {
  console.log(`Server started on 0.0.0.0:${PORT}`)
})
