interface ParserOptions {
  competitionRegex?: string
  teamsRegex?: string
  teamsRegexUseFullnames?: boolean
  conditionIsOr?: boolean
  matchBothTeams?: boolean
  ignoreTbd?: boolean
  shouldVerbose?: boolean
  pastMatchAllowSeconds?: number

  expectMissingTeams?: boolean
}

interface EventData {
  uid: string
  dateTimestamp: number
  team1: string
  team2: string
  team1fullName: string
  team2fullName: string
  team1Logo: string
  team2Logo: string
  competition: string
  summary: string
  description: string
  winnerSide: string
  descriptor: string
  descriptorMoreInfo: string
  team1Url: string
  team2Url: string
}
