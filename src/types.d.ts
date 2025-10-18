interface ParserOptions {
  url?: string
  competitionRegex?: string
  teamsRegex?: string
  teamsRegexUseFullnames?: boolean
  conditionIsOr?: boolean
  matchBothTeams?: boolean
  ignoreTbd?: boolean
  shouldVerbose?: boolean
  pastMatchAllowSeconds?: number

  expectMissingTeams?: boolean // will completely ignore
  allowMissingTeams?: boolean // will try but ignore if not found
}

interface EventData {
  uid: string
  dateTimestamp: number

  team1: string
  team2: string

  team1fullName: string
  team2fullName: string

  team1Url: string
  team2Url: string

  team1Logo: string
  team2Logo: string

  competition: string
  competitionUrl: string

  summary: string
  description: string
  descriptor: string
  descriptorMoreInfo: string

  winnerSide: string
  isMissingTeams: boolean
}

interface SupportedGame {
  id: string
  name: string
  url: string
  baseUrl: string
  enforcedOpts: ParserOptions
}
