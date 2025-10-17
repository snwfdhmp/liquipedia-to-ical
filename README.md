# Liquipedia to iCal URL

<img src="https://i.imgur.com/LYT2wIt.png" alt="Example Calendar Event" width="70%">

<a href="https://ics.snwfdhmp.com">
  <img src="https://i.ibb.co/sdpwfTMv/image.png" alt="Liquipedia to iCal" width="70%">
</a>

- Sync Liquipedia matches to your Calendar.
- Events are refreshed when the iCal URL is re-fetched by your Calendar application. (generally every 5 minutes)

## Compatibility

| Game              | Working                  |
| ----------------- | ------------------------ |
| Rocket League     | ✅ _Can get calendar events for Rocket League_                        |
| League of Legends | ✅ _Can get calendar events for League of Legends_                        |
| Counter-Strike    | ✅ _Can get calendar events for Counter-Strike_                        |
| Apex Legends      | ✅ _Can get calendar events for Apex Legends_                        |
| PUBG              | ✅ _Can get calendar events for PUBG_                        |
| Starcraft 2       | ✅ _Can get calendar events for Starcraft 2_                        |
| VALORANT          | ✅ _Can get calendar events for VALORANT_                        |
| Trackmania        | ✅ _Can get calendar events for Trackmania_                        |
| Dota 2            | ✅ _Can get calendar events for Dota 2_                        |
| Age of Empires    | ✅ _Can get calendar events for Age of Empires_                        |
| EA Sports FC      | ✅ _Can get calendar events for EA Sports FC_                        |
| Mobile Legends    | ✅ _Can get calendar events for Mobile Legends_                        |
| Call of Duty      | ✅ _Can get calendar events for Call of Duty_                        |
| Wild Rift         | ✅ _Can get calendar events for Wild Rift_                        |
| Rainbow Six       | ✅ _Can get calendar events for Rainbow Six_                        |
| Overwatch         | ✅ _Can get calendar events for Overwatch_                        |
| Brawl Stars       | ✅ _Can get calendar events for Brawl Stars_                        |
| Hearthstone       | ✅ _Can get calendar events for Hearthstone_                        |
| Heroes of the Storm | ✅ _Can get calendar events for Heroes of the Storm_                      |
| Warcraft          | ✅ _Can get calendar events for Warcraft_                        |
| Honor of Kings    | ✅ _Can get calendar events for Honor of Kings_                        |
| World of Tanks    | ✅ _Can get calendar events for World of Tanks_                        |
| StarCraft         | ✅ _Can get calendar events for StarCraft_                        |
| Other games       | Test yourself and report |

**It also supports**: Critical Ops, Omega Strikers, Arena FPS, Paladins, War Thunder, Sim Racing, Rematch, Team Fortress, Magic, Chess, Pokémon, Dota Underlords, Naraka: Bladepoint, GeoGuessr, Splitgate, Deadlock, Teamfight Tactics, Clash of Clans, Tetris, Autochess, Halo, Splatoon, SMITE, Clash Royale, Zula, osu!, PUBG Mobile, Marvel Rivals, CrossFire, World of Warcraft, Free Fire, Tarkov Arena, and maybe more!

Feel free to report any issue or any working/broken game in [issues](https://github.com/snwfdhmp/liquipedia-cal/issues).

## What is it ?

I was tired of not having any simple way of adding esport matches to my calendar. Some apps tried to achieve that but none really achieved that simply and none integrates well into my workflow. So I build this.

This service lets you use **Liquipedia match pages as iCal URLs**, also known as .ICS URLs.

It parses the Liquipedia match page in real time and returns events as ICS.

## How does it work ?

Find the match page of the game you want. For example [Rocket League](https://liquipedia.net/rocketleague/Liquipedia:Matches) or [League of Legends](https://liquipedia.net/leagueoflegends/Liquipedia:Matches). <ins>Strictly use pages of this format or it won't work.</ins>

Copy the page URL and put it in this URL: `https://ics.snwfdhmp.com/matches.ics?url=YOUR_URL`.

Example URLs below on this page.

Import this URL in your Calendar App and it will produce events like this.

![Example Calendar Event](https://i.imgur.com/LYT2wIt.png)

> "???" means that the opponent is not yet defined and will be later when the competition administrators announce the opponent officially.

## How to filter only matches I'm interested in ?

Use URL parameters :

| Parameter name              | Description                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `competition_regex`         | Filter competition using REGEX.                                                                                    |
| `teams_regex`               | Filter teams using REGEX. Use team tags (eg: KC, T1)                                                               |
| `teams_regex_use_fullnames` | Set to "true" to use full team names instead of tags for `teams_regex` (eg: "Karmine Corp" instead of "KC")        |
| `condition_is_or`           | Set to "true" if you want competition_regex and teams_regex to be tested as an OR condition (by default, its AND). |
| `ignore_tbd`                | Ignore matches that have "TBD" as team1 and team2 (TBD = To Be Done) (ie: announced match with unannounced teams)  |

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


## Contribute

Pull Requests are welcome, please follow standard rules.

## Need help ?

I made [this website](https://ics.snwfdhmp.com) to help you build your URL.

You can also reach out to me using GitHub issues or discord : `@mjo___`.
