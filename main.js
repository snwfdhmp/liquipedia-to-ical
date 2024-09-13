// Import des modules nécessaires
import axios from "axios"
import * as cheerio from "cheerio"
import express from "express"

// URL à fetch
// const url = "https://liquipedia.net/rocketleague/Liquipedia:Matches"

// const inputCompetitionRegex = "^RLCS"
const competitionMatches = (event, competitionRegex) => {
  if (!event.competition.match(competitionRegex)) return false
  return true
}

// const inputTeamsMatches = "^(KC|M8|VIT)$"
// const inputTeamsMatches = ""
const teamsMatches = (event, competitionRegex) => {
  if (
    !event.team1.match(competitionRegex) &&
    !event.team2.match(competitionRegex)
  )
    return false
  return true
}

// Fonction pour récupérer les matchs à venir de Rocket League
async function fetchMatches(
  url,
  competitionRegex,
  teamsRegex,
  conditionIsOr = false
) {
  try {
    // Fetch de la page
    const response = await axios.get(url)

    // Charger la réponse HTML dans cheerio
    const $ = cheerio.load(response.data)

    // Tableau pour stocker les événements
    const events = []

    // Sélection des éléments du tableau de matchs
    $(
      ".matches-list div:nth-child(2) div:nth-child(2) .infobox_matches_content"
    ).each((index, element) => {
      // Récupération des dates, équipes et nom de la compétition
      const dateTimestamp = parseInt(
        $(element).find(".timer-object").attr("data-timestamp")
      )
      const team1 = $(element)
        .find(".team-left span.team-template-text")
        .text()
        .trim()
      const team2 = $(element)
        .find(".team-right span.team-template-text")
        .text()
        .trim()

      if (!team1 || !team2) return

      // OLD WAY OF OBTAINING COMPETITION, DOES NOT WORK FOR ALL GAMES
      // const competition = $(element)
      //   .find(".match-filler tbody tr td:nth-child(2)")
      //   .text()
      //   .trim()

      let competition = $(element).find(".match-filler")
      competition.find(".match-countdown").remove()
      competition = competition.text().trim()
      let competitionSubPart
      try {
        competitionSubPart =
          $(element).find(".versus abbr").attr("title") || null
      } catch (error) {
        // ignore missing competition subpart
      }

      const eventData = {
        uid:
          `${competition.replace(
            /[^a-zA-Z0-9\-]/g,
            ""
          )}/${dateTimestamp}/${team1}/${team2}` +
          "@liquipedia-calendar.snwfdhmp.com",
        dateTimestamp,
        team1,
        team2,
        competition,
        summary:
          `${team1} vs ${team2} [${competition}]` +
          (competitionSubPart ? ` [${competitionSubPart}]` : ""),
      }

      const competitionOk = competitionMatches(eventData, competitionRegex)
      const teamsOk = teamsMatches(eventData, teamsRegex)

      // if condition is OR, need at least one to be true
      if (conditionIsOr && !competitionOk && !teamsOk) return
      // if condition is AND, need both to be true
      if (!conditionIsOr && (!competitionOk || !teamsOk)) return
      events.push(eventData)
      console.log({ eventData })
    })

    // Retourner les événements sous forme d'ICS
    return events
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
  const timePart = date.toTimeString().split(" ")[0].replace(/:/g, "")
  return `${datePart}T${timePart}`
}

const buildCalendar = (events) => {
  // events = events.slice(0, 2)

  const headers = `BEGIN:VCALENDAR
  VERSION:2.0
  PRODID:-//com.snwfdhmp.liquipedia-calendar//NONSGML v1.0//EN
  CALSCALE:GREGORIAN
  METHOD:PUBLISH
  BEGIN:VTIMEZONE
  TZID:Europe/Paris
  X-LIC-LOCATION:Europe/Paris
  BEGIN:DAYLIGHT
  TZOFFSETFROM:+0100
  TZOFFSETTO:+0200
  TZNAME:CEST
  DTSTART:20230326T020000
  RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
  END:DAYLIGHT
  BEGIN:STANDARD
  TZOFFSETFROM:+0200
  TZOFFSETTO:+0100
  TZNAME:CET
  DTSTART:20231029T030000
  RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
  END:STANDARD
  END:VTIMEZONE`
    .split("\n")
    .map((line) => line.trim())
    .join("\n")

  const footers = `END:VCALENDAR`

  const body = events
    .map((event) =>
      `BEGIN:VEVENT
      UID:${event.uid}
      DTSTAMP;TZID=Europe/Paris:${timestampToIcs(event.dateTimestamp)}
      DTSTART;TZID=Europe/Paris:${timestampToIcs(event.dateTimestamp)}
      DURATION: PT1H
      SUMMARY:${event.summary}
      DESCRIPTION:${event.competition}
      END:VEVENT
    `
        .split("\n")
        .map((line) => line.trim())
        .join("\n")
    )
    .join("\n\n")

  return `${headers}\n\n${body}\n\n${footers}`
}

// todo: store events and set DTSTAMP when event discovered/updated
// const cal = buildCalendar(await fetchMatches())
// console.log(cal)
// fs.writeFileSync("rocket.ics", cal)

const app = express()
// log requests
app.use((req, res, next) => {
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress
  console.log(
    `${ip.padEnd(15)} ${req.method} ${req.url}${JSON.stringify(req.query)}`
  )
  next()
})
app.get("/", (req, res) => {
  res.send("com.snwfdhmp.liquipedia-calendar")
})
app.get("/matches.ics", async (req, res) => {
  // read url, competition_regex and teams_regex from query params
  console.log({ query: req.query })
  const {
    url,
    competition_regex: competitionRegex,
    teams_regex: teamsRegex,
    condition_is_or: conditionIsOr,
  } = req.query
  if (!url) {
    res.status(400).send("Missing url query param")
    return
  }

  try {
    const ics = buildCalendar(
      await fetchMatches(url, competitionRegex, teamsRegex, conditionIsOr)
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
