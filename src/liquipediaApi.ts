import axios from "axios"

// ############################################################################
// # WHY THIS EXISTS                                                          #
// #                                                                          #
// # Liquipedia put a Cloudflare Turnstile interstitial in front of its wiki  #
// # pages some time around 2026-03-30. Scraping the HTML page therefore      #
// # returns a "Verify you are human" document with status 403 from every     #
// # path, including through the proxy pool, so the calendar has been serving #
// # empty feeds since July 2026.                                             #
// #                                                                          #
// # The MediaWiki API on the same host is not behind Turnstile and returns   #
// # the very same parsed HTML in parse.text["*"], which the existing cheerio #
// # selectors already understand. So the fix is to change where the HTML     #
// # comes from, not how it is parsed.                                        #
// ############################################################################

// Liquipedia's API terms require a descriptive User-Agent naming the tool and
// giving them a way to reach the operator.
const USER_AGENT =
  process.env.LIQUIPEDIA_USER_AGENT ??
  "liquipedia-cal/1.0 (https://esports-calendar.snwfdhmp.com; snwfdhmp@gmail.com)"

// Their terms cap action=parse at one request per 30 seconds. This is the
// single most restrictive thing about this approach, so it is enforced here
// rather than trusted to callers.
const PARSE_MIN_INTERVAL_MS = Number(
  process.env.LIQUIPEDIA_PARSE_INTERVAL_MS ?? 30_000
)

let parseChain: Promise<unknown> = Promise.resolve()
let lastParseStartedAt = 0

// Serialise every parse call through one chain and space them out. Requests
// queue rather than being dropped, because a slow calendar is a better failure
// than a banned one.
const throttleParse = <T>(run: () => Promise<T>): Promise<T> => {
  const result = parseChain.then(async () => {
    const waitMs = PARSE_MIN_INTERVAL_MS - (Date.now() - lastParseStartedAt)
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }
    lastParseStartedAt = Date.now()
    return run()
  })
  // Keep the chain usable after a rejection, and do not leak an unhandled one.
  parseChain = result.catch(() => undefined)
  return result
}

export interface WikiPageRef {
  wiki: string
  page: string
}

/**
 * Turn a Liquipedia wiki page URL into the wiki + page title the API needs.
 *
 * Returns null for anything that is not a plain liquipedia.net wiki page, so
 * callers can fall back to fetching the URL directly.
 */
export const parseWikiUrl = (url: string): WikiPageRef | null => {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  if (parsed.hostname.toLowerCase() !== "liquipedia.net") return null
  // Already an API call - leave it alone rather than wrapping it twice.
  if (parsed.pathname.endsWith("/api.php")) return null

  const segments = parsed.pathname.split("/").filter(Boolean)
  if (segments.length < 2) return null

  const [wiki, ...rest] = segments
  const page = decodeURIComponent(rest.join("/"))
  if (!wiki || !page) return null

  return { wiki, page }
}

/**
 * Fetch the rendered HTML of a wiki page through the MediaWiki API.
 */
export const fetchWikiPageHtml = async (ref: WikiPageRef): Promise<string> => {
  const response = await throttleParse(() =>
    axios.get(`https://liquipedia.net/${ref.wiki}/api.php`, {
      params: {
        action: "parse",
        page: ref.page,
        format: "json",
        prop: "text",
        redirects: "1",
      },
      headers: {
        "User-Agent": USER_AGENT,
        // Their terms ask API clients to accept gzip.
        "Accept-Encoding": "gzip",
      },
      timeout: 30_000,
    })
  )

  // MediaWiki reports "page missing" style problems in a 200 body, not a status.
  const apiError = response.data?.error
  if (apiError) {
    throw new Error(
      `Liquipedia API error for ${ref.wiki}/${ref.page}: ${
        apiError.code ?? "unknown"
      } ${apiError.info ?? ""}`.trim()
    )
  }

  const html = response.data?.parse?.text?.["*"]
  if (typeof html !== "string" || html.length === 0) {
    throw new Error(
      `Liquipedia API returned no HTML for ${ref.wiki}/${ref.page}`
    )
  }

  return html
}
