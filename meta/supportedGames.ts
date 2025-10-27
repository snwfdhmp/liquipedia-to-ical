/**
 * Import the generated list of supported games
 */
import supportedGamesData from "./supportedGames.doNotEdit.json" with { type: "json" }
import { SupportedGame } from "../src/types.js"

/**
 * Contains a list of supported games that are tested and supported by the service.
 *
 * If you are contributing, you should test that your edits did not break any existing game by running 'pnpm run test' and checking that all tests pass for those games.
 */
export const supportedGames: SupportedGame[] = supportedGamesData

export const supportedGamesHashMap = Object.fromEntries(
  supportedGames.map((game) => [game.id, game]),
)
