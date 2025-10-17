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
    "should have unique uids": (result: TestResult) =>
      result.eventData.length ===
      new Set(result.eventData.map((event) => event.uid)).size,
    "should have >0 events": (result: TestResult) =>
      result.eventData.length > 0,
    "should not have build calendar error": (result: TestResult) =>
      result.buildCalendarError !== null,
    "should have icsEventsCount equal to eventData.length": (
      result: TestResult
    ) => result.icsEventsCount === result.eventData.length,
    // events expectations
    "should have some events with unique competitions": (result: TestResult) =>
      result.competitionsUnique.length > 0,
    "should have all events with summary": (result: TestResult) =>
      result.eventData.every(
        (event) => event.summary && event.summary.trim() !== ""
      ),
    "all events should have have description": (result: TestResult) =>
      result.eventData.every(
        (event) => event.description && event.description.trim() !== ""
      ),
    "all events should have have dateTimestamp": (result: TestResult) =>
      result.eventData.every((event) => event.dateTimestamp > 0),
    ...(!testCase?.enforcedOpts?.expectMissingTeams &&
    !testCase?.enforcedOpts?.allowMissingTeams
      ? {
          "all events should have team1": (result: TestResult) =>
            result.eventData.some(
              (event) => event.team1 && event.team1.trim() !== ""
            ),
          "all events should have team2": (result: TestResult) =>
            result.eventData.some(
              (event) => event.team2 && event.team2.trim() !== ""
            ),
          "some events should have team1Urls": (result: TestResult) =>
            result.eventData.some(
              (event) => event.team1Url && event.team1Url.trim() !== ""
            ),
          "some events should have team2Urls": (result: TestResult) =>
            result.eventData.some(
              (event) => event.team2Url && event.team2Url.trim() !== ""
            ),
          "some events should have team1fullName": (result: TestResult) =>
            result.eventData.some(
              (event) =>
                event.team1fullName && event.team1fullName.trim() !== ""
            ),
          "some events should have team2fullName": (result: TestResult) =>
            result.eventData.some(
              (event) =>
                event.team2fullName && event.team2fullName.trim() !== ""
            ),
          "some events should have team1Logo": (result: TestResult) =>
            result.eventData.some(
              (event) => event.team1Logo && event.team1Logo.trim() !== ""
            ),
          "some events should have team2Logo": (result: TestResult) =>
            result.eventData.some(
              (event) => event.team2Logo && event.team2Logo.trim() !== ""
            ),
        }
      : {}),
  }
}

export interface TestOptions {
  limitTestsTo?: string[]
  opts?: {
    verbose?: boolean
    onlyOutputErrors?: boolean
  }
}
export async function test({
  limitTestsTo,
  opts,
}: TestOptions): Promise<boolean> {
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

  if (testCases.length === 0) {
    console.log(colors.red("❌") + " No tests to run".red)
    return false
  }

  const results: Record<string, TestResult> = {}

  const promises = []
  for (const testCase of testCases) {
    promises.push(
      (async () => {
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
      })()
    )
  }

  await Promise.all(promises)

  let errorsCount = 0
  for (const [name, result] of Object.entries(results)) {
    const hasErrors = Object.values(
      makeExpectations(testCases.find((testCase) => testCase.name === name))
    ).some((expectationFn) => !expectationFn(result))

    console.log(
      `${hasErrors ? colors.red("❌") : colors.green("✅")} ${name}: ${
        result.eventData.length
      } events in ${result.timeSpent}ms`
    )

    if (opts?.verbose) {
      console.log(JSON.stringify(result, null, 2))
      console.log(testCases.find((testCase) => testCase.name === name).url)
    }

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
      if (!opts?.onlyOutputErrors || !expectationResult) {
        console.log(`\t${colors[color](label)} ${expectation}`)
      }
      if (!expectationResult) {
        errorsCount++
      }
    }
  }

  const color = errorsCount === 0 ? "green" : "red"
  console.log(colors[color](`Tests finished with ${errorsCount} errors`))

  return errorsCount === 0
}
