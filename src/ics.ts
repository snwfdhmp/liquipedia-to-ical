const timestampToIcs = (timestamp: number) => {
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

export const buildCalendar = (events: EventData[]) => {
  const optionalData = {
    "X-LIQUIPEDIATOICAL-COMPETITION": "competition",
    "X-LIQUIPEDIATOICAL-COMPETITIONURL": "competitionUrl",
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
            event[value] ? [`${key}:${event[value]}`] : null
          )
          .filter(Boolean),
        `END:VEVENT`,
      ].join("\n")
    )
    .join("\n\n")

  return wrapIcs(body)
}

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

const wrapIcs = (ics: string) => {
  return [...icsWrappers.before, ics, ...icsWrappers.after].join("\n")
}

const unwrapIcs = (ics: string) => {
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
      ].includes(line)
  )
  return filteredLines.join("\n").trim()
}

export const mergeIcs = (ics1: string, ics2: string) => {
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
