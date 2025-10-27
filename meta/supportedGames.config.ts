import { SupportedGame } from "../src/types.js"

/**
 * Those are disabled because they are broken in Liquipedia
 */
export const supportedGamesDisabled = [
  "sideswipe", // page does not contain any event
]

/**
 * Those games require some extra configuration to work
 */
export const supportedGamesOverload: Record<string, Partial<SupportedGame>> = {
  apexlegends: {
    enforcedOpts: {
      expectMissingTeams: true,
    },
  },
  pubg: {
    enforcedOpts: {
      expectMissingTeams: true,
    },
  },
  pubgmobile: {
    enforcedOpts: {
      expectMissingTeams: true,
    },
  },
  simracing: {
    enforcedOpts: {
      expectMissingTeams: true,
    },
  },
  trackmania: {
    enforcedOpts: {
      allowMissingTeams: true,
    },
  },
  autochess: {
    enforcedOpts: {
      allowMissingTeams: true,
    },
  },
  naraka: {
    enforcedOpts: {
      allowMissingTeams: true,
    },
  },
  tft: {
    enforcedOpts: {
      allowMissingTeams: true,
    },
  },
  underlords: {
    enforcedOpts: {
      allowMissingTeams: true,
    },
  },
}
