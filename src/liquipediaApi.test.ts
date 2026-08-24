import { test, describe } from "node:test"
import assert from "node:assert/strict"

import { parseWikiUrl } from "./liquipediaApi.js"

/*
 * parseWikiUrl decides whether a request can be served at all: anything it
 * returns null for now gets a 400 instead of being dragged through the scraping
 * fallback. That makes it worth pinning down precisely.
 *
 * Run with: npx tsx --test src/liquipediaApi.test.ts
 */

describe("parseWikiUrl", () => {
  test("a normal wiki page URL splits into wiki and page", () => {
    assert.deepEqual(
      parseWikiUrl("https://liquipedia.net/rocketleague/Liquipedia:Matches"),
      { wiki: "rocketleague", page: "Liquipedia:Matches" }
    )
  })

  test("percent-encoding in the page title is decoded", () => {
    assert.deepEqual(
      parseWikiUrl(
        "https://liquipedia.net/starcraft/Liquipedia%3AUpcoming_and_ongoing_matches"
      ),
      { wiki: "starcraft", page: "Liquipedia:Upcoming_and_ongoing_matches" }
    )
  })

  test("a page title containing slashes is kept whole", () => {
    assert.deepEqual(
      parseWikiUrl(
        "https://liquipedia.net/starcraft/Liquipedia:Upcoming_and_ongoing_matches/dynamic"
      ),
      {
        wiki: "starcraft",
        page: "Liquipedia:Upcoming_and_ongoing_matches/dynamic",
      }
    )
  })

  /*
   * The reason this branch exists: two clients hand-built API URLs and sent
   * those as ?url=, which used to be rejected outright and end in a cheerio
   * error on a JSON body.
   */
  test("a hand-built API URL is read rather than rejected", () => {
    assert.deepEqual(
      parseWikiUrl(
        "https://liquipedia.net/dota2/api.php?action=parse&page=Liquipedia:Matches&format=json"
      ),
      { wiki: "dota2", page: "Liquipedia:Matches" }
    )
  })

  test("an API URL with no wiki in the path stays unresolvable", () => {
    // This is the shape actually seen in the logs. The page title alone is not
    // enough -- "Dota_2" exists on several wikis -- so guessing would be wrong.
    assert.equal(
      parseWikiUrl(
        "https://liquipedia.net/api.php?action=parse&page=Dota_2&format=json&prop=text"
      ),
      null
    )
  })

  test("an API URL with a wiki but no page= stays unresolvable", () => {
    assert.equal(
      parseWikiUrl("https://liquipedia.net/dota2/api.php?action=parse"),
      null
    )
  })

  test("other hosts are not ours to resolve", () => {
    assert.equal(
      parseWikiUrl("https://example.com/rocketleague/Liquipedia:Matches"),
      null
    )
  })

  test("a wiki root with no page is unresolvable", () => {
    assert.equal(parseWikiUrl("https://liquipedia.net/rocketleague"), null)
  })

  test("garbage that is not a URL does not throw", () => {
    assert.equal(parseWikiUrl("not a url"), null)
    assert.equal(parseWikiUrl(""), null)
  })
})
