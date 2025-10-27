import { parseEventsFromUrl } from "./parse.js"

import { EventData, ParserOptions } from "./types.js"

const competitionMatches = (event, regex) => {
  const regexExtended = new RegExp(regex, "i")
  if (!event.competition.match(regexExtended)) return false
  return true
}

const teamsMatches = (event, regex, matchBothTeams, useFullnames = false) => {
  const regexExtended = new RegExp(regex, "i")

  const team1 = useFullnames ? event.team1fullName : event.team1
  const team2 = useFullnames ? event.team2fullName : event.team2

  const team1ok = team1?.match(regexExtended)
  const team2ok = team2?.match(regexExtended)

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
  const rejectionRules = {
    date: (eventData: EventData) => {
      return (
        eventData.dateTimestamp >=
        Date.now() / 1000 - opts.pastMatchAllowSeconds
      )
    },
    missingTeams: (eventData: EventData) => {
      if (!eventData.team1 || !eventData.team2) {
        return opts.allowMissingTeams || opts.expectMissingTeams
      }
      return true
    },
    ignoreTbd: (eventData: EventData) => {
      if (
        opts.ignoreTbd &&
        eventData.team1 === "???" &&
        eventData.team2 === "???"
      )
        return false
      return true
    },
    regex: (eventData: EventData) => {
      const competitionOk = competitionMatches(eventData, opts.competitionRegex)
      const teamsOk =
        opts.expectMissingTeams ||
        (opts.allowMissingTeams && eventData.isMissingTeams) ||
        (opts.teamsRegexUseFullnames
          ? teamsFullnameMatches(
              eventData,
              opts.teamsRegex,
              opts.matchBothTeams
            )
          : teamsMatches(eventData, opts.teamsRegex, opts.matchBothTeams))

      if (opts.conditionIsOr) {
        return competitionOk || teamsOk
      } else {
        return competitionOk && teamsOk
      }
    },
  }

  return events.filter((eventData) => {
    let failingTest: string | null
    for (const [key, value] of Object.entries(rejectionRules)) {
      if (!value(eventData)) {
        failingTest = key
        break
      }
    }

    verbose("EVENT", {
      selected: !failingTest,
      failingTest,
      eventData,
      opts,
    })

    return !failingTest
  })
}

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
    let events = await parseEventsFromUrl(url, opts, verbose)
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
