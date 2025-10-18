export interface ApiOption {
  kind: "string" | "boolean" | "number"
  title: string
  urlParam: string
  shouldShowInUi?: (o: ParserOptions) => boolean
}

export const apiOptions: Record<
  Exclude<keyof ParserOptions, "url">,
  ApiOption
> = {
  competitionRegex: {
    kind: "string",
    urlParam: "competition_regex",
    title: "Filter based on competition",
  },
  teamsRegex: {
    kind: "string",
    urlParam: "teams_regex",
    title: "Filter based on teams",
  },
  teamsRegexUseFullnames: {
    kind: "boolean",
    urlParam: "teams_regex_use_fullnames",
    title: "Use team complete names for filtering",
    shouldShowInUi: (o) => o.teamsRegex?.length > 0,
  },
  conditionIsOr: {
    kind: "boolean",
    urlParam: "condition_is_or",
    title: "Either team OR competition must match the filter",
    shouldShowInUi: (o) =>
      o.teamsRegex?.length > 0 && o.competitionRegex?.length > 0,
  },
  ignoreTbd: {
    kind: "boolean",
    urlParam: "ignore_tbd",
    title: 'Ignore events if both team names are "???"',
  },
  shouldVerbose: {
    kind: "boolean",
    urlParam: "verbose",
    title: "Verbose mode",
    shouldShowInUi: () => false,
  },
  matchBothTeams: {
    kind: "boolean",
    urlParam: "match_both_teams",
    title: "Require team A and team B to match the team filter",
    shouldShowInUi: (o) => o.teamsRegex?.length > 0,
  },
  pastMatchAllowSeconds: {
    kind: "number",
    urlParam: "past_match_allow_seconds",
    title: "Remove events older than X seconds",
  },
  expectMissingTeams: {
    kind: "boolean",
    urlParam: "expect_missing_teams",
    title: "Expect missing teams (useful for Battle Royale games)",
    shouldShowInUi: () => false,
  },
  allowMissingTeams: {
    kind: "boolean",
    urlParam: "allow_missing_teams",
    title: "Allow missing teams (useful for Battle Royale games)",
  },
}
