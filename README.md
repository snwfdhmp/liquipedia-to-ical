# Liquipedia to iCal

[![Liquipedia to iCal](https://i.imgur.com/GgW2kgA.png)](https://ics.snwfdhmp.com)

- Sync Liquipedia matches to your Calendar.
- Events are refreshed when the iCal URL is re-fetched by your Calendar. (generally every 15 minutes)

## What is it ?

I was tired of not having any simple way of adding esport matches to my calendar. Some apps tried to achieve that but none really achieved that simply and none integrates well into my workflow. So I build this.

This service lets you use **Liquipedia match pages as iCal URLs**, also known as .ICS URLs.

It parses the Liquipedia match page in real time and returns events as ICS.

## How does it work ?

Find the match page of the game you want. For example [Rocket League](https://liquipedia.net/rocketleague/Liquipedia:Matches) or [League of Legends](https://liquipedia.net/leagueoflegends/Liquipedia:Matches). <ins>Strictly use pages of this format or it won't work.</ins>

Copy the page URL and put it in this URL: `https://ics.snwfdhmp.com/matches.ics?url=YOUR_URL`.

Example URLs below on this page.

Import this URL in your Calendar App and it will produce events like this.

![Example Calendar Event](https://i.imgur.com/ygMA306.png)

Events will be updated regularly with new matches. Every time the Calendar URL is fetched, it parses the Liquipedia page for new matches.

## How to filter only matches I'm interested in ?

Use URL parameters :

| Parameter name      | Description                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `competition_regex` | Filter competition using REGEX.                                                                                    |
| `teams_regex`       | Filter teams using REGEX. Use team tags (eg: KC, T1)                                                               |
| `condition_is_or`   | Set to "true" if you want competition_regex and teams_regex to be tested as an OR condition (by default, its AND). |
| `ignore_tbd`        | Ignore matches that have "TBD" as team1 and team2 (TBD = To Be Done) (ie: announced match with unannounced teams)  |

Encode REGEX using [URL encoding](https://www.urlencoder.org/).

## Example URLs

### Add any of these iCAL URL to your Calendar App to import Liquipedia matches into your own calendar.

### 📅 https://ics.snwfdhmp.com/matches.ics?url=https://liquipedia.net/leagueoflegends/Liquipedia:Matches

League of Legends, all matches

### 📅 https://ics.snwfdhmp.com/matches.ics?url=https://liquipedia.net/leagueoflegends/Liquipedia:Matches&competition_regex=%5EWorlds

League of Legends, only Worlds matches

### 📅 https://ics.snwfdhmp.com/matches.ics?url=https://liquipedia.net/leagueoflegends/Liquipedia:Matches&competition_regex=%5ELEC

League of Legends, only LEC matches

### 📅 https://ics.snwfdhmp.com/matches.ics?url=https://liquipedia.net/leagueoflegends/Liquipedia:Matches&competition_regex=%5E%28Worlds%7CLCK%29

League of Legends, Worlds and LCK matches

### 📅 https://ics.snwfdhmp.com/matches.ics?url=https://liquipedia.net/leagueoflegends/Liquipedia:Matches&competition_regex=%5EWorlds&condition_is_or=true&teams_regex=%5E%28KC%7CM8%7CVIT%7CBDS%7CG2%29%24

League of Legends, Worlds matches + any match featuring KC or M8 or VIT or BDS or G2

### 📅 https://ics.snwfdhmp.com/matches.ics?url=https://liquipedia.net/rocketleague/Liquipedia:Matches

Rocket League, all matches

### 📅 https://ics.snwfdhmp.com/matches.ics?url=https://liquipedia.net/rocketleague/Liquipedia:Matches&competition_regex=%5EWorlds

Rocket League, only Worlds matches

### 📅 https://ics.snwfdhmp.com/matches.ics?url=https://liquipedia.net/rocketleague/Liquipedia:Matches&teams_regex=%5EKC%24

Rocket League, only matches featuring KC

### 📅 https://ics.snwfdhmp.com/matches.ics?url=https://liquipedia.net/rocketleague/Liquipedia:Matches&competition_regex=Major

Rocket League, only competitions that have "Major" in their name

### 📅 https://ics.snwfdhmp.com/matches.ics?url=https://liquipedia.net/rocketleague/Liquipedia:Matches&competition_regex=%5ERLCS&condition_is_or=true&teams_regex=%5E%28KC%7CM8%7CVIT%7CG2%7CBDS%29%24

Rocket League, Worlds matches + any match featuring KC or M8 or VIT or BDS or G2

### 📅 https://ics.snwfdhmp.com/matches.ics?url=https://liquipedia.net/counterstrike/Liquipedia:Matches&ignore_tbd=true

Counter-Strike, all matches except "TBD" (unknown teams)

## Compatibility

| Game              | Working                  |
| ----------------- | ------------------------ |
| Rocket League     | ✅                       |
| League of Legends | ✅                       |
| Counter-Strike    | ✅                       |
| Other games       | Test yourself and report |

Feel free to report any issue or any working/broken game in [issues](https://github.com/snwfdhmp/liquipedia-cal/issues).

## Contribute

Pull Requests are welcome, please follow standard rules.

## Help

Reach out to me in GitHub issues or discord : `@mjo___`
