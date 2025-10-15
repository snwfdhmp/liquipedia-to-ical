export const apiOptions = {
  competition_regex: {
    allowedValues: "string",
  },
  teams_regex: {
    allowedValues: "string",
  },
  teams_regex_use_fullnames: {
    allowedValues: ["true", "false"],
  },
  condition_is_or: {
    allowedValues: ["true", "false"],
  },
  ignore_tbd: {
    allowedValues: "string",
  },
  verbose: {
    allowedValues: "string",
    hideInUI: true,
  },
  match_both_teams: {
    allowedValues: ["true", "false"],
  },
  past_match_allow_seconds: {
    allowedValues: "number",
  },
  expect_missing_teams: {
    allowedValues: ["true", "false"],
  },
}
