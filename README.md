# 🏀 Sigdle

Sigdle is an **NBA Wordle-style guessing game** where you try to guess the mystery NBA player.  
Instead of letters, you use attributes like **team, conference, division, position, height, and jersey number**.  
Each guess gives you hints until you narrow it down to the correct player.

**Play the game here:** [sigdle.netlify.app](https://sigdle.netlify.app/)


## 📊 Data Sources

Sigdle pulls live NBA data from two main APIs:

1. **ESPN API**  
   Used for **active rosters, player metadata, team/conference/division info, jersey numbers, ages, and positions**.  
   Base URL: `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/`

2. **Unofficial NBA Stats API (NBA Stats API 2.0)**  
   Provides **season statistics (totals, advanced metrics, shot charts) and historical data (player career team history)**.  
   Data is cross-referenced with **Basketball-Reference** and **NBA.com**.  
   Base URL: `https://api.server.nbaapi.com/`
