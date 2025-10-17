import * as cheerio from "cheerio"
import { getRandomAxios } from "./proxies.js"
import { getCache, setCache } from "./cache.js"

const tryMultipleSelectors = (findFunc, selectors) => {
  for (const selector of selectors) {
    const elements = findFunc(selector)
    if (elements?.length > 0) return elements
  }
  return null
}

const getTeam = ($, element, isTeam1: boolean) => {
  let team = tryMultipleSelectors(
    (selector) => $(element).find(selector),
    isTeam1
      ? [
          ".team-left span.team-template-text",
          ".team-left a",
          ".match-info-header > div:nth-child(1)",
        ]
      : [
          ".team-right span.team-template-text",
          ".team-right a",
          ".match-info-header > div:nth-child(3)",
        ]
  )
    ?.text()
    ?.trim()

  if (team === "TBD") team = "???"
  return team
}

const getTeamFullName = ($, element, isTeam1: boolean) => {
  try {
    let text = $(element)
      .find(isTeam1 ? ".team-left span" : ".team-right span")
      .attr("data-highlightingclass")
      ?.text?.()
      ?.trim()

    if (!text) {
      // second method
      text = tryMultipleSelectors(
        (selector) => $(element).find(selector)?.attr("title")?.trim(),
        [
          isTeam1
            ? ".match-info-header > div:nth-child(1) span.name a"
            : ".match-info-header > div:nth-child(3) span.name a",
          isTeam1
            ? ".team-left .inline-player a"
            : ".team-right .inline-player a",
          isTeam1
            ? ".team-left .team-template-text a"
            : ".team-right .team-template-text a",
          isTeam1
            ? ".team-left .team-template-image-icon a"
            : ".team-right .team-template-image-icon a",
          isTeam1
            ? ".team-left .starcraft-inline-player a"
            : ".team-right .starcraft-inline-player a",
        ]
      )
    }

    text = text?.replace(/\s*\(page does not exist\)/g, "")
    if (text === "TBD") text = "??? (to be determined)"
    return text
  } catch (e) {
    console.warn(
      `Error while getting team full name for ${isTeam1 ? "team1" : "team2"}`,
      e
    )
    return null
  }
}

const searchLogoInElements = (imgElements): string | null => {
  if (!imgElements) return null
  if (!Array.isArray(imgElements)) imgElements = [imgElements]
  if (!imgElements.length) return null

  for (const imgElement of imgElements) {
    if (!imgElement.is("img")) continue

    const srcsets = imgElement.attr("srcset")?.split(", ") || []
    const imgList = [
      imgElement.attr("src"),
      ...srcsets.map((src) => src?.split(" ")?.[0]),
    ]
    const bestImg = imgList?.[imgList.length - 1]
    if (!bestImg) continue

    if (bestImg.startsWith("/")) {
      return "https://liquipedia.net" + bestImg
    }
  }
  return null
}

const getTeamLogo = ($, element, isTeam1: boolean) => {
  try {
    let logo = tryMultipleSelectors(
      (selector) => searchLogoInElements($(element).find(selector)),
      [
        isTeam1
          ? ".team-left .team-template-darkmode img"
          : ".team-right .team-template-darkmode img",
        isTeam1
          ? ".team-left .team-template-text img"
          : ".team-right .team-template-text img",
        isTeam1
          ? ".team-left .team-template-image-icon img"
          : ".team-right .team-template-image-icon img",
        isTeam1
          ? ".match-info-header > div:nth-child(1) .team-template-image-icon img"
          : ".match-info-header > div:nth-child(3) .team-template-image-icon img",
        isTeam1
          ? ".match-info-header > div:nth-child(1) img"
          : ".match-info-header > div:nth-child(3) img",
        isTeam1
          ? ".team-left .inline-player .flag img"
          : ".team-right .inline-player .flag img",
        isTeam1
          ? ".team-left .starcraft-inline-player .flag img"
          : ".team-right .starcraft-inline-player .flag img",
      ]
    )

    return logo
  } catch (e) {
    console.warn(
      `Error while getting team logo for ${isTeam1 ? "team1" : "team2"}`,
      e
    )
    return null
  }
}

const makeSummary = (
  team1: string,
  team2: string,
  descriptor: string,
  competition: string,
  dateTimestamp: number
) => {
  let summary = ""
  if (team1 && team2) {
    summary += `${team1} vs ${team2} `
  }
  if (descriptor && dateTimestamp > Date.now() / 1000) {
    summary += `(${descriptor}) `
  }
  if (competition) {
    summary += `[${competition}]`
  }
  return summary
}

const makeDescription = (
  team1: string,
  team2: string,
  descriptor: string,
  descriptorMoreInfo: string,
  competition: string
) => {
  let description = ""

  if (team1 && team2) {
    description += `${team1} vs ${team2} `
  }
  if (descriptor) {
    description += `(${descriptorMoreInfo || descriptor}) `
  }
  if (competition) {
    description += `[${competition}]`
  }

  return description
}

const getTeamUrl = ($, element, isTeam1: boolean): string | null => {
  try {
    let teamUrl = tryMultipleSelectors(
      (selector) => $(element).find(selector),
      [
        isTeam1
          ? ".team-left .team-template-darkmode a"
          : ".team-right .team-template-darkmode a",
        isTeam1
          ? ".team-left .team-template-text a"
          : ".team-right .team-template-text a",
        isTeam1
          ? ".team-left .inline-player a"
          : ".team-right .inline-player a",
        isTeam1
          ? ".team-left .starcraft-inline-player a"
          : ".team-right .starcraft-inline-player a",
        isTeam1
          ? ".match-info-header > div:nth-child(1) a"
          : ".match-info-header > div:nth-child(3) a",
      ]
    )

    let teamHref = teamUrl?.attr("href")

    if (teamHref && teamHref.startsWith("/")) {
      teamHref = "https://liquipedia.net" + teamHref
      if (teamHref.includes("redlink=1")) {
        teamHref = null
      }
    }
    return teamHref
  } catch (e) {
    console.warn(
      `Error while getting team url for ${isTeam1 ? "team1" : "team2"}`,
      e
    )
    return null
  }
}

const getCompetition = ($, element): string => {
  let competitionEl = $(element).find(".match-filler")
  let competition: string
  if (competitionEl.length !== 0) {
    competitionEl.find(".match-countdown").remove()
    competition = competitionEl.text().trim()
    return competition
  }

  // second method
  competitionEl = tryMultipleSelectors(
    (selector) => $(element).find(selector),
    [".match-tournament", ".match-info-tournament"]
  )
  if (competitionEl) {
    competition = competitionEl.text().trim()
    return competition
  }

  return ""
}

const getDescriptors = (
  $,
  element
): { descriptor: string; descriptorMoreInfo: string } => {
  const cleanupDescriptor = (descriptor: string) => {
    if (!descriptor) return descriptor
    return descriptor.replace(/\s*vs\s*/g, "")
  }

  const versus = $(element).find(".versus")

  let descriptor: string
  let descriptorMoreInfo: string
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
    descriptorMoreInfo = $(element).find(".versus abbr").attr("title") || null
  }
  if (descriptor || descriptorMoreInfo) {
    return { descriptor: cleanupDescriptor(descriptor), descriptorMoreInfo }
  }

  // second method
  const descriptorEl = $(element).find(".match-info-header-scoreholder")
  if (descriptorEl.length) {
    descriptor =
      descriptorEl.text() ||
      descriptorEl.html() ||
      descriptorEl.attr("title") ||
      null
    descriptorMoreInfo = descriptorEl.attr("title") || null
  }
  return { descriptor: cleanupDescriptor(descriptor), descriptorMoreInfo }
}

const getWinnerSide = ($, element): string => {
  try {
    const winnerLeft = $(element).hasClass("winner-left")
    if (winnerLeft) {
      return "left"
    }
    const winnerRight = $(element).hasClass("winner-right")
    if (winnerRight) {
      return "right"
    }
  } catch (e) {
    console.log(`Error while checking for winner: ${e}`)
  }

  // second method
  try {
    const winnerLeft = $(element)
      .find(".match-info-header > div:nth-child(1)")
      .hasClass("match-info-header-winner")
    if (winnerLeft) {
      return "left"
    }
    const winnerRight = $(element)
      .find(".match-info-header > div:nth-child(3)")
      .hasClass("match-info-header-winner")
    if (winnerRight) {
      return "right"
    }
  } catch (e) {
    console.log(`Error while checking for winner: ${e}`)
  }
}

const getDateTimestamp = ($, element): number => {
  const dateTimestamp = parseInt(
    $(element).find(".timer-object").attr("data-timestamp")
  )
  return dateTimestamp
}

const parseMatchFromElement = (
  $: cheerio.CheerioAPI,
  element,
  opts: ParserOptions,
  verbose: (...args: any[]) => void
): EventData | null => {
  const dateTimestamp = getDateTimestamp($, element)

  let team1 = getTeam($, element, true)
  let team2 = getTeam($, element, false)

  let team1fullName = getTeamFullName($, element, true)
  let team2fullName = getTeamFullName($, element, false)

  let team1Logo = getTeamLogo($, element, true)
  let team2Logo = getTeamLogo($, element, false)

  let team1Url = getTeamUrl($, element, true)
  let team2Url = getTeamUrl($, element, false)

  let competition = getCompetition($, element)
  let { descriptor, descriptorMoreInfo } = getDescriptors($, element)

  let winnerSide = getWinnerSide($, element)

  // ================ COMPILE EVENT DATA ================
  let isMissingTeams = false
  if (!team1 || !team2) {
    isMissingTeams = true
  }

  let summary = makeSummary(
    team1,
    team2,
    descriptor,
    competition,
    dateTimestamp
  )

  let description = makeDescription(
    team1fullName || team1,
    team2fullName || team2,
    descriptor,
    descriptorMoreInfo,
    competition
  )

  const uid =
    `${competition?.replace(
      /[^a-zA-Z0-9\-]/g,
      ""
    )}/${dateTimestamp}/${team1}/${team2}` + "@liquipedia-calendar.snwfdhmp.com"
  return {
    uid,
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
    isMissingTeams,
  }
}

/**
 * Parse all events from a URL
 *
 * Uses cache for performance
 *
 * Events are not filtered here, they should be filtered later
 */
export const parseEventsFromUrl = async (
  url: string,
  opts: ParserOptions,
  verbose: (...args: any[]) => void
): Promise<EventData[]> => {
  const cacheKey = `parseEventsFromUrl-${url}`
  const cached = getCache(cacheKey)
  if (cached) {
    return cached
  }

  const events = []
  const proxyAxios = await getRandomAxios()
  const $ = cheerio.load((await proxyAxios.get(url)).data)

  // the different selectors to try, depends on page layout
  const matchSelectorsToTry = [".wikitable", ".match", ".match-info"]
  let elements = tryMultipleSelectors($, matchSelectorsToTry) || []
  if (!elements) elements = []

  // ================ FOR EACH MATCH ================
  try {
    elements.each((index, element) => {
      try {
        const eventData = parseMatchFromElement($, element, opts, verbose)
        if (!eventData) return
        // ================ CHECK IF EVENT SHOULD BE SELECTED ================

        events.push(eventData)
        verbose({ eventData })
      } catch (e) {
        console.error(`Error while parsing match from element: ${e}`)
        return
      }
    })
  } catch (e) {
    console.error(`Error while parsing matches from ${url}: ${e}`)
    return []
  }

  setCache(cacheKey, events)
  return events
}
