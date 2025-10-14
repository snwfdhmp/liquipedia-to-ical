export const presets = {
  rocketbets: [
    "https://ics.snwfdhmp.com/matches.ics?url=https%3A%2F%2Fliquipedia.net%2Frocketleague%2FLiquipedia%3AMatches&competition_regex=RLCS&past_match_allow_seconds=2592000",
  ],
  rlcs: [
    "https://ics.snwfdhmp.com/matches.ics?url=https%3A%2F%2Fliquipedia.net%2Frocketleague%2FLiquipedia%3AMatches&competition_regex=RLCS",
  ],
  "rlcs-worlds": [
    "https://ics.snwfdhmp.com/matches.ics?url=https%3A%2F%2Fliquipedia.net%2Frocketleague%2FLiquipedia%3AMatches&competition_regex=RLCS.*Worlds",
  ],
  "rlcs-major": [
    "https://ics.snwfdhmp.com/matches.ics?url=https%3A%2F%2Fliquipedia.net%2Frocketleague%2FLiquipedia%3AMatches&competition_regex=RLCS.*Major",
  ],
  "rlcs-fifae": [
    "https://ics.snwfdhmp.com/matches.ics?url=https%3A%2F%2Fliquipedia.net%2Frocketleague%2FLiquipedia%3AMatches&competition_regex=FIFA",
  ],
  "rlcs-enjoyer": [
    "https://ics.snwfdhmp.com/preset/rlcs-major",
    "https://ics.snwfdhmp.com/preset/rlcs-worlds",
    "https://ics.snwfdhmp.com/preset/rlcs-fifae",
    "https://ics.snwfdhmp.com/preset/rlcs-match-s-tier",
  ],
  "rlcs-match-s-tier": [
    "https://ics.snwfdhmp.com/matches.ics?url=https%3A%2F%2Fliquipedia.net%2Frocketleague%2FLiquipedia%3AMatches&teams_regex=%5E%28KC%7CVIT%7CFUR%7CFLCN%7CM8%7CNRG%7CTWIS%7CTS%29%24&match_both_teams=true",
  ],
  "rocket-league": "https://ics.snwfdhmp.com/preset/rlcs",
}
