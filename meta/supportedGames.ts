/**
 * Import the generated list of supported games
 */
import supportedGamesData from "./supportedGames.doNotEdit.json" with { type: "json" }

/**
 * Contains a list of supported games that are tested and supported by the service.
 *
 * If you are contributing, you should test that your edits did not break any existing game by running 'pnpm run test' and checking that all tests pass for those games.
 */
export const supportedGames: SupportedGame[] = Object.values(supportedGamesData)
