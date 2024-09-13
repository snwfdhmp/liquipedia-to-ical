# Liquipedia to iCal

## What is it ?

I was tired of not having any simple way of adding esport matches to my calendar. Some apps try to achieve that but none is really simple and integrates well in my workflow. So I build this.

This service lets import iCal URLs, also known as .ICS URLs, based on Liquipedia pages.

It parses the Liquipedia match page and returns events as ICS.

## How does it work ?

Find the match page you want. For example [Rocket League](https://liquipedia.net/rocketleague/Liquipedia:Matches) or [League of Legends](https://liquipedia.net/leagueoflegends/Liquipedia:Matches). Strictly use pages of this format or it won't work.

Your calendar URL is `https://ics.snwfdhmp.com/matches.ics?url=<your_url>`.

It will produce events like this:

![Example Calendar Event](https://i.imgur.com/ygMA306.png)
{: width="800px"}

## How to filter only matches I'm interested in ?

Use URL parameters :

- competition_regex: Filter competition using REGEX.
- teams_regex: Filter teams using REGEX. Use team tags (eg: KC, T1)
- condition_is_or: Set to "true" if you want competition_regex and teams_regex to be tested as an OR condition (by default, its AND).

Encode REGEX using [URL encoding](https://www.urlencoder.org/).

## Example URLs

| url                                                                                                                                                                                                  | description                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| https://ics.snwfdhmp.com/matches.ics?url=https://liquipedia.net/leagueoflegends/Liquipedia:Matches&competition_regex=%5EWorlds&condition_is_or=true&teams_regex=%5E%28KC%7CM8%7CVIT%7CBDS%7CG2%29%24 | League of Legends, shows Worlds matches and also any matches featuring KC or M8 or VIT or BDS or G2 |
| https://ics.snwfdhmp.com/matches.ics?url=https://liquipedia.net/rocketleague/Liquipedia:Matches&teams_regex=%5EKC%24                                                                                 | Rocket League, shows only matches featuring KC                                                      |

| https://ics.snwfdhmp.com/matches.ics?url=https://liquipedia.net/rocketleague/Liquipedia:Matches&competition_regex=Major | Rocket League, shows only competitions that have 'Major' in their name|
