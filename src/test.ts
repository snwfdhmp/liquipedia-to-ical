import { supportedGames } from "../meta/supportedGames.js"
import { fetchMatches } from "./fetch.js"
import { buildCalendar } from "./ics.js"
import colors from "colors"

interface TestResult {
  eventData: EventData[]
  competitionsUnique: string[]
  buildCalendarError: string | null
  icsEventsCount: number
  timeSpent: number
}

interface TestCase {
  name: string
  url: string
  enforcedOpts: ParserOptions
}

const makeExpectations = (testCase: TestCase) => {
  return {
    "has events": (result: TestResult) => result.eventData.length > 0,
    "no build calendar error": (result: TestResult) =>
      result.buildCalendarError !== null,
    "icsEventsCount is equal to eventData.length": (result: TestResult) =>
      result.icsEventsCount === result.eventData.length,

    // events expectations
    "some events have unique competitions": (result: TestResult) =>
      result.competitionsUnique.length > 0,
    "some events have dates": (result: TestResult) =>
      result.eventData.some((event) => event.dateTimestamp > 0),
    ...(!testCase?.enforcedOpts?.expectMissingTeams &&
    !testCase?.enforcedOpts?.allowMissingTeams
      ? {
          "all events have team1": (result: TestResult) =>
            result.eventData.some(
              (event) => event.team1 && event.team1.trim() !== ""
            ),
          "all events have team2": (result: TestResult) =>
            result.eventData.some(
              (event) => event.team2 && event.team2.trim() !== ""
            ),
        }
      : {}),
  }
}

export async function test({
  limitTestsTo,
}: {
  limitTestsTo?: string[]
}): Promise<boolean> {
  let testCases = supportedGames

  const knownNames = {}
  for (const testCase of testCases) {
    if (knownNames[testCase.name]) {
      console.log(`\t${colors.red("❌")} ${testCase.name} - duplicate name`)
      return false
    }
    knownNames[testCase.name] = true
  }

  const filteredTests = limitTestsTo || []
  if (filteredTests.length > 0) {
    testCases = testCases.filter((testCase) =>
      filteredTests.includes(testCase.name)
    )
  }

  const results: Record<string, TestResult> = {}
  for (const testCase of testCases) {
    console.log(`=============== Testing "${testCase.name}" ===============`)

    const timeStart = Date.now()

    // Fetch events
    const eventData = await fetchMatches(testCase.url, {
      ...testCase.enforcedOpts,
      // shouldVerbose: true,
      pastMatchAllowSeconds: 60 * 60 * 24 * 365,
    })

    // Derive some data
    const competitionsUnique = [
      ...new Set(eventData.map((event) => event.competition)),
    ].filter((competition) => competition.trim() !== "")

    // Test building calendar
    let buildCalendarError: string | null
    let icsEventsCount: number
    try {
      const ics = buildCalendar(eventData)
      icsEventsCount = ics.match(/BEGIN:VEVENT/g)?.length || 0
    } catch (e) {
      buildCalendarError =
        e instanceof Error ? e.message : `Unknown error: ${e}`
    }

    // Save results
    results[testCase.name] = {
      eventData,
      competitionsUnique,
      buildCalendarError,
      icsEventsCount,
      timeSpent: Date.now() - timeStart,
    }
  }

  let errorsCount = 0
  for (const [name, result] of Object.entries(results)) {
    console.log(
      `${name}: ${result.eventData.length} events in ${result.timeSpent}ms`
    )
    for (const [expectation, expectationFn] of Object.entries(
      makeExpectations(testCases.find((testCase) => testCase.name === name))
    )) {
      if (!expectationFn) {
        console.log(
          `\t${colors.red(
            "❌"
          )} ${expectation} - could not determine expectations`
        )
        continue
      }
      const expectationResult = expectationFn(result)
      const label = expectationResult ? "✅" : "❌"
      const color = expectationResult ? "green" : "red"
      console.log(`\t${colors[color](label)} ${expectation}`)
      if (!expectationResult) {
        errorsCount++
      }
    }
    // console.log({ result })
  }

  const color = errorsCount === 0 ? "green" : "red"
  console.log(colors[color](`Tests finished with ${errorsCount} errors`))

  return errorsCount === 0
}
