// stream-schedule-segment--element

// Import des modules nécessaires
import axios from "axios"
import * as cheerio from "cheerio"
import express from "express"
import puppeteer from "puppeteer"

let VERBOSE = true

// if -q is passed, disable verbose
if (process.argv.includes("-q")) VERBOSE = false

// Fonction pour récupérer les streams à venir
async function fetchEvents(url, opts) {
  const { conditionIsOr = false, shouldVerbose = false } = opts || {}
  try {
    const events = []

    // // load content with axios
    const response = await axios.get(url)
    const content = response.data

    // // load content with puppeteer
    // const browser = await puppeteer.launch({
    //   args: ["--no-sandbox", "--disable-setuid-sandbox"],
    //   headless: true,
    // })
    // const page = await browser.newPage()
    // await page.goto(url, { waitUntil: "networkidle2" })
    // const content = await page.content()

    const $ = cheerio.load(content)

    const containerSelectorsToTry = [".a-pressable-img"]

    let elements = null
    for (const selector of containerSelectorsToTry) {
      elements = $(selector)
      if (elements.length > 0) break
    }

    // Sélection des éléments du tableau de matchs
    const promises = []
    elements.each((index, element) => {
      // navigate to <a> href
      const href = $(element).attr("href")
      const link = new URL(href, url).href
      promises.push(
        axios.get(link).then((response) => {
          const $$ = cheerio.load(response.data)
          const h1 = $$("h1")
          const title = h1.text()

          // get first sibling of h1
          const author = h1.next().text()
          const infoZone = h1.next().next().find("div:nth-child(2)")
          const date = infoZone.find("div:nth-child(1)").text()
          const location = infoZone.find("div:nth-child(2)").text()
          const address = infoZone.find("div:nth-child(3)").text()
          console.log({ title, author, date, location, address })
        })
      )
    })

    await Promise.all(promises)

    // display all opts as \t separated string
    console.log(
      `${events.length} events fetched from ${url}${Object.entries(opts)
        .map(([key, value]) => `${key}=${value}`)
        .join("\t")}`
    )

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
  PRODID:-//com.snwfdhmp.twitch-calendar//NONSGML v1.0//EN
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
      LOCATION:${event.competition}
      DTSTAMP;TZID=Europe/Paris:${timestampToIcs(event.dateTimestamp)}
      DTSTART;TZID=Europe/Paris:${timestampToIcs(event.dateTimestamp)}
      DURATION:PT40M
      SUMMARY:${event.summary}
      END:VEVENT
    `
        .split("\n")
        .map((line) => line.trim())
        .join("\n")
    )
    .join("\n\n")

  return `${headers}\n\n${body}\n\n${footers}`
}

const app = express()
// log requests
app.use((req, res, next) => {
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress
  console.log(
    `${new Date().toISOString()}\t${ip.padEnd(15)} ${req.method} ${
      req.url
    }${JSON.stringify(req.query)}`
  )
  next()
})
app.get("/", (req, res) => {
  res.send("com.snwfdhmp.liquipedia-calendar")
})
app.get("/stream.ics", async (req, res) => {
  // read url, competition_regex and teams_regex from query params
  const { url, verbose: shouldVerbose } = req.query

  if (!url) {
    res.status(400).send("Missing url query param")
    return
  }

  try {
    const ics = buildCalendar(
      await fetchEvents(url, {
        shouldVerbose,
      })
    )
    res.setHeader("Content-Type", "text/calendar; charset=utf-8")
    res.setHeader("Content-Disposition", "attachment; filename=calendar.ics")
    res.send(ics)
  } catch (error) {
    res.status(500).send("Erreur lors de la récupération des matchs")
    console.error(error)
  }
})

const PORT = process.env.PORT || 9060
app.listen(PORT, () => {
  console.log(`Server started on 0.0.0.0:${PORT}`)
})
