import * as cheerio from "cheerio"
import { parseMatchFromElement, tryMultipleSelectors } from "./parse.js"
import { getRandomAxios } from "./proxies.js"

const competitionMatches = (event, regex) => {
  const regexExtended = new RegExp(regex, "i")
  if (!event.competition.match(regexExtended)) return false
  return true
}

const teamsMatches = (event, regex, matchBothTeams, useFullnames = false) => {
  const regexExtended = new RegExp(regex, "i")

  const team1 = useFullnames ? event.team1fullName : event.team1
  const team2 = useFullnames ? event.team2fullName : event.team2

  const team1ok = team1.match(regexExtended)
  const team2ok = team2.match(regexExtended)

  if (!team1ok && !team2ok) return false
  if (matchBothTeams) {
    if (!team1ok || !team2ok) return false
  }
  return true
}

const teamsFullnameMatches = (event, regex, matchBothTeams) => {
  return teamsMatches(event, regex, matchBothTeams, true)
}

export const filterEvents = (
  events: EventData[],
  opts: ParserOptions,
  verbose: (...args: any[]) => void
) => {
  return events.filter((eventData) => {
    const competitionOk = competitionMatches(eventData, opts.competitionRegex)
    const teamsOk =
      opts.expectMissingTeams ||
      (opts.teamsRegexUseFullnames
        ? teamsFullnameMatches(eventData, opts.teamsRegex, opts.matchBothTeams)
        : teamsMatches(eventData, opts.teamsRegex, opts.matchBothTeams))

    let shouldBeSelected = false
    if (opts.conditionIsOr) {
      shouldBeSelected = competitionOk || teamsOk
    } else {
      shouldBeSelected = competitionOk && teamsOk
    }
    verbose({
      competition: eventData.competition,
      competitionOk,
      team1: eventData.team1,
      team2: eventData.team2,
      teamsOk,
      conditionIsOr: opts.conditionIsOr,
      shouldBeSelected,
    })

    if (!shouldBeSelected) {
      verbose(`Ignoring match: ${JSON.stringify(eventData)}`)
      return false
    }

    return true
  })
}

// Fonction pour récupérer les matchs à venir de Rocket League
export async function fetchMatches(url: string, opts: ParserOptions) {
  const DEFAULT_OPTS: ParserOptions = {
    competitionRegex: ``,
    teamsRegex: ``,
    teamsRegexUseFullnames: false,
    conditionIsOr: false,
    matchBothTeams: false,
    ignoreTbd: false,
    shouldVerbose: false,
    pastMatchAllowSeconds: 3600 * 2,
  }

  for (const [key, value] of Object.entries(DEFAULT_OPTS)) {
    if (!opts[key]) {
      opts[key] = value
    }
  }

  const verbose = (...args) => {
    if (opts.shouldVerbose) console.log(...args)
  }
  try {
    let events = []

    const proxyAxios = await getRandomAxios()
    const $ = cheerio.load((await proxyAxios.get(url)).data)

    // the different selectors to try, depends on page layout
    const matchSelectorsToTry = [".wikitable", ".match", ".match-info"]
    let elements = tryMultipleSelectors($, matchSelectorsToTry) || []
    if (!elements) elements = []

    // ================ FOR EACH MATCH ================
    elements.each((index, element) => {
      const eventData = parseMatchFromElement($, element, opts, verbose)
      if (!eventData) return
      // ================ CHECK IF EVENT SHOULD BE SELECTED ================

      events.push(eventData)
      verbose({ eventData })
    })

    events = filterEvents(events, opts, verbose)

    // ================ FILTER UNIQUE EVENTS ================
    const uniqueEvents: EventData[] = []
    const uids = new Set<string>()
    for (const event of events) {
      if (uids.has(event.uid)) continue
      uids.add(event.uid)
      uniqueEvents.push(event)
    }

    verbose(
      `${
        uniqueEvents.length
      } matches returned from\n\turl=${url}\n\t${Object.entries(opts)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n\t")}`
    )

    return uniqueEvents
  } catch (error) {
    console.error("Erreur lors de la récupération des matchs:", error)
    throw error
  }
}
