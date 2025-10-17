# 📅 Liquipedia Calendar - Sync Esports Matches to Your Calendar

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js](https://img.shields.io/badge/Node.js-18+-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Live Service](https://img.shields.io/badge/Live%20Service-ics.snwfdhmp.com-brightgreen.svg)](https://ics.snwfdhmp.com)
[![GitHub stars](https://img.shields.io/github/stars/snwfdhmp/liquipedia-cal.svg?style=social&label=Star)](https://github.com/snwfdhmp/liquipedia-cal)
[![GitHub issues](https://img.shields.io/github/issues/snwfdhmp/liquipedia-cal.svg)](https://github.com/snwfdhmp/liquipedia-cal/issues)


<img src="https://i.imgur.com/LYT2wIt.png" alt="Example Calendar Event" width="70%">


**Automatically sync esports matches from Liquipedia to your calendar** with customizable filters for competitions and teams. Works with Google Calendar, Apple Calendar, Outlook, and any calendar application that supports iCal/ICS feeds.

🌐 **Live Service**: [ics.snwfdhmp.com](https://ics.snwfdhmp.com)

## ✨ Features

- 🎮 **50+ Supported Games**: Rocket League, League of Legends, CS2, Valorant, Dota 2, Overwatch, and many more
- 📱 **Universal Compatibility**: Works with Google Calendar, Apple Calendar, Outlook, iOS, Android
- 🔍 **Smart Filtering**: Filter by competition names, team names, or both
- ⚡ **Real-time Updates**: Calendar automatically updates when new matches are scheduled
- 🎯 **Preset Configurations**: Pre-built filters for popular tournaments (RLCS, Worlds, Majors)
- 🔧 **Advanced Options**: Regex support, team name matching, past match inclusion
- 📊 **Built-in Analytics**: Track usage and performance metrics
- 🌐 **Web Interface**: User-friendly URL builder with live preview

## 🚀 Quick Start

### Option 1: Use the Web Interface _(For non-devs)_

1. Visit [ics.snwfdhmp.com](https://ics.snwfdhmp.com)
2. Select your game and customize filters
3. Click "📅 Add to Calendar" or copy the generated URL
4. Import into your calendar application

### Option 2: Direct API Usage **(Recommended)**

Generate calendar URLs using this format:
```
https://ics.snwfdhmp.com/matches.ics?url=LIQUIPEDIA_URL&[OPTIONS]
```

**Example**: Rocket League RLCS matches from the RLCS series
```
https://ics.snwfdhmp.com/matches.ics?url=https%3A%2F%2Fliquipedia.net%2Frocketleague%2FLiquipedia%3AMatches&competition_regex=RLCS
```

### Option 3: Use Presets

Access pre-configured tournament feeds:
```
https://ics.snwfdhmp.com/preset/PRESET_NAME
```

Available presets:
- `rlcs` - All RLCS matches
- `rlcs-worlds` - RLCS World Championships
- `rlcs-major` - RLCS Major tournaments
- `rocket-league` - All Rocket League matches

> If you want to add your preset, feel free to update [the preset file](src/presets.ts)

## 📖 API Documentation

### Base Endpoint
```
GET /matches.ics[?opts]
```

### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `url` | string | **Required**. Liquipedia matches page URL | `https://liquipedia.net/rocketleague/Liquipedia:Matches` |
| `competition_regex` | string | Filter competitions by regex pattern | `RLCS.*World` |
| `teams_regex` | string | Filter teams by regex pattern | `KC\|G2\|VIT` |
| `teams_regex_use_fullnames` | boolean | Use full team names instead of abbreviations | `true` |
| `match_both_teams` | boolean | Require both teams to match the filter | `true` |
| `condition_is_or` | boolean | Use OR logic between competition and team filters | `true` |
| `ignore_tbd` | boolean | Skip matches with undefined teams | `true` |
| `past_match_allow_seconds` | number | Include past matches within X seconds | `86400` |

### Multiple URL Support

Combine multiple Liquipedia pages in one calendar:
```
/matches.ics
    ?1_url=URL1
    &2_url=URL2
    &2_competition_regex=PATTERN_FOR_2
    &3_url=URL3
    &3_teams_regex=PATTERN_FOR_3
```

It will merge events from the 3 configurations

### Preset Endpoint
```
GET /preset/:name
```

## 🎮 Supported Games

The service supports **50+ esports titles** including:

**Popular Games:**
- Rocket League
- League of Legends  
- Counter-Strike 2
- Valorant
- Dota 2
- Overwatch
- Starcraft II
- Trackmania
- And many more...

[View complete list of supported games](meta/supportedGames.md)

## 🐛 Troubleshooting

### Common Issues


**No matches found?**
- Verify the Liquipedia URL is correct
- Check if the game has upcoming matches
- Try broader filter criteria
- For Battle Royale and games whose events do not advertise as "Team A vs Team B", use `allow_missing_teams=true`
- Open an issue if a supported game isn't working

**Calendar not updating?**
- Check if your calendar app supports automatic refresh
- Try removing and re-adding the calendar subscription

### Getting Help

- 📝 [Open an issue](https://github.com/snwfdhmp/liquipedia-cal/issues) on GitHub
- 💬 Contact on Discord: `mjo___`
- 🌐 Test your URL at [ics.snwfdhmp.com](https://ics.snwfdhmp.com)

## Additional iCal tags

|name|value|
|---|---|
|X-LIQUIPEDIATOICAL-COMPETITION|competition|
|X-LIQUIPEDIATOICAL-TEAMLEFT|team1|
|X-LIQUIPEDIATOICAL-TEAMLEFTFULLNAME|team1fullName|
|X-LIQUIPEDIATOICAL-TEAMLEFTURL|team1Url|
|X-LIQUIPEDIATOICAL-TEAMLEFTLOGO|team1Logo|
|X-LIQUIPEDIATOICAL-TEAMRIGHT|team2|
|X-LIQUIPEDIATOICAL-TEAMRIGHTFULLNAME|team2fullName|
|X-LIQUIPEDIATOICAL-TEAMRIGHTURL|team2Url|
|X-LIQUIPEDIATOICAL-TEAMRIGHTLOGO|team2Logo|
|X-LIQUIPEDIATOICAL-WINNERSIDE|winnerSide|
|X-LIQUIPEDIATOICAL-DESCRIPTOR|descriptor|
|X-LIQUIPEDIATOICAL-DESCRIPTORMOREINFO|descriptorMoreInfo|

## 🛠️ Contributing

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Setup
```bash
# Clone the repository
git clone https://github.com/snwfdhmp/liquipedia-cal.git
cd liquipedia-cal

# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Run tests
pnpm run test
```

## 🧪 Testing

The project includes comprehensive testing for all supported games:

```bash
# Run all tests
pnpm run test

# Run tests and only show failing tests
pnpm run test -o

# Run tests for Rocket League
pnpm run test "Rocket League"

# Run tests for Rocket League and verbose output
pnpm run test -v "Rocket League"
```

### Custom Presets

Add new presets in `src/presets.ts`:
```typescript
export const presets: Record<string, string[]> = {
  "my-preset": [
    "https://ics.snwfdhmp.com/matches.ics?url=...",
  ],
}
```

---

**Made with ❤️ for the esports community**

*Star ⭐ this repository if you find it useful!*

*[❤️ Sponsoring](https://github.com/sponsors/snwfdhmp) helps me spending time on this and paying for the servers!*
