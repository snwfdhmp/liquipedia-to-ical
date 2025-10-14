import * as cheerio from "cheerio"

export const tryMultipleSelectors = (findFunc, selectors) => {
  for (const selector of selectors) {
    const elements = findFunc(selector)
    if (elements?.length > 0) return elements
  }
  return null
}

const getTeam1 = ($, element) => {
  return tryMultipleSelectors(
    (selector) => $(element).find(selector),
    [
      ".team-left span.team-template-text",
      ".team-left a",
      ".match-info-header > div:nth-child(1)",
    ]
  )
    ?.text()
    ?.trim()
}

const getTeam2 = ($, element) => {
  return tryMultipleSelectors(
    (selector) => $(element).find(selector),
    [
      ".team-right span.team-template-text",
      ".team-right a",
      ".match-info-header > div:nth-child(3)",
    ]
  )
    ?.text()
    ?.trim()
}

const getTeam1FullName = ($, element) => {
  try {
    const text = $(element)
      .find(".team-left span")
      .attr("data-highlightingclass")
    return text?.text()?.trim()
  } catch {
    return null
  }
}

const getTeam2FullName = ($, element) => {
  try {
    const text = $(element)
      .find(".team-right span")
      .attr("data-highlightingclass")
    return text?.text()?.trim()
  } catch {
    return null
  }
}

const searchLogoInElement = (imgElement) => {
  if (!imgElement) return null
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

const getTeam1Logo = ($, element) => {
  try {
    const team1ImgElement = $(element).find(
      ".team-left .team-template-darkmode img"
    )
    const logo = searchLogoInElement(team1ImgElement)
    return logo
  } catch {
    return null
  }
}

const getTeam2Logo = ($, element) => {
  try {
    const team2ImgElement = $(element).find(
      ".team-right .team-template-darkmode img"
    )
    const logo = searchLogoInElement(team2ImgElement)
    return logo
  } catch {
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

export const parseMatchFromElement = (
  $: cheerio.CheerioAPI,
  element,
  opts: ParserOptions,
  verbose: (...args: any[]) => void
): EventData | null => {
  verbose(`ELEMENT TEXT: ${$(element).text()}`)

  // ================ DATE ================
  const dateTimestamp = parseInt(
    $(element).find(".timer-object").attr("data-timestamp")
  )
  verbose(`DATE TIMESTAMP: ${dateTimestamp}`)
  if (dateTimestamp < Date.now() / 1000 - opts.pastMatchAllowSeconds) {
    verbose(
      `Ignoring match too old: ${dateTimestamp}\n` +
        `Date as ISO UTC: ${new Date(dateTimestamp * 1000).toISOString()}`
    )
    return null
  }

  // ================ TEAM NAMES ================
  let team1 = getTeam1($, element)
  verbose(`TEAM 1: ${team1}`)
  let team2 = getTeam2($, element)
  verbose(`TEAM 2: ${team2}`)

  let team1fullName = getTeam1FullName($, element)
  let team2fullName = getTeam2FullName($, element)

  let team1Logo = getTeam1Logo($, element)
  let team2Logo = getTeam2Logo($, element)

  let team1Url: string
  let team2Url: string

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

  if (!opts.expectMissingTeams) {
    if (!team1 || !team2) {
      verbose("Ignoring match with missing teams")
      return null
    }
  }
  if (opts.ignoreTbd && team1 === "TBD" && team2 === "TBD") {
    verbose("Ignoring match with TBD team")
    return null
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
  let competitionEl = $(element).find(".match-filler")
  let competition: string
  if (competitionEl.length !== 0) {
    competitionEl.find(".match-countdown").remove()
    competition = competitionEl.text().trim()
  } else {
    competitionEl = tryMultipleSelectors(
      (selector) => $(element).find(selector),
      [".match-tournament", ".match-info-tournament"]
    )
    if (competitionEl) {
      competition = competitionEl.text().trim()
    }
  }
  let descriptor: string
  let descriptorMoreInfo: string
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
      descriptorMoreInfo = $(element).find(".versus abbr").attr("title") || null
    }
  } catch {}

  let winnerSide = ""
  try {
    const winnerLeft = $(element).hasClass("winner-left")
    if (winnerLeft) {
      winnerSide = "left"
    }
    const winnerRight = $(element).hasClass("winner-right")
    if (winnerRight) {
      winnerSide = "right"
    }
  } catch (e) {
    console.log(`Error while checking for winner: ${e}`)
  }

  // ================ COMPILE EVENT DATA ================
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
    `${competition.replace(
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
  }
}
