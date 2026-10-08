# English football pyramid references (2026/27)

New five-tier careers use the full 2026/27 reference membership: 20 Premier
League clubs and 24 clubs in each of the next four competitions, for 116 clubs.
The five leagues generate 38 or 46 home-and-away matches per club. The game
displays fictional parody club names and generated players. Tottunham is the
story exception: it represents the manager's club in the National League while
its inspiration, Tottenham Hotspur, belongs to the Premier League.

The complete reference membership used by the data model is:

| Game division | Competition | 2026/27 reference clubs |
| --- | --- | --- |
| 1 | Premier League | Arsenal; Aston Villa; AFC Bournemouth; Brentford; Brighton & Hove Albion; Chelsea; Coventry City; Crystal Palace; Everton; Fulham; Hull City; Ipswich Town; Leeds United; Liverpool; Manchester City; Manchester United; Newcastle United; Nottingham Forest; Sunderland; Tottenham Hotspur |
| 2 | Championship | Birmingham City; Blackburn Rovers; Bolton Wanderers; Bristol City; Burnley; Cardiff City; Charlton Athletic; Derby County; Lincoln City; Middlesbrough; Millwall; Norwich City; Portsmouth; Preston North End; Queens Park Rangers; Sheffield United; Southampton; Stoke City; Swansea City; Watford; West Bromwich Albion; West Ham United; Wolverhampton Wanderers; Wrexham |
| 3 | League One | AFC Wimbledon; Barnsley; Blackpool; Bradford City; Bromley; Burton Albion; Cambridge United; Doncaster Rovers; Huddersfield Town; Leicester City; Leyton Orient; Luton Town; Mansfield Town; Milton Keynes Dons; Notts County; Oxford United; Peterborough United; Plymouth Argyle; Reading; Sheffield Wednesday; Stevenage; Stockport County; Wycombe Wanderers; Wigan Athletic |
| 4 | League Two | Accrington Stanley; Barnet; Bristol Rovers; Cheltenham Town; Chesterfield; Colchester United; Crawley Town; Crewe Alexandra; Exeter City; Fleetwood Town; Gillingham; Grimsby Town; Newport County; Northampton Town; Oldham Athletic; Port Vale; Rochdale; Rotherham United; Salford City; Shrewsbury Town; Swindon Town; Tranmere Rovers; Walsall; York City |
| 5 | National League | AFC Fylde; Aldershot Town; Altrincham; Barrow; Boreham Wood; Boston United; Carlisle United; Eastleigh; FC Halifax Town; Forest Green Rovers; Gateshead; Harrogate Town; Hartlepool United; Hornchurch; Kidderminster Harriers; Scunthorpe United; Solihull Moors; Southend United; Sutton United; Tamworth; Wealdstone; Woking; Worthing; Yeovil Town |

The reference lists are season-specific and were checked against official
competition sources: [Premier League 2026/27 membership and fixtures](https://www.premierleague.com/en/news/4673099/the-202627-premier-league-season-officially-starts), [EFL 2026/27 fixtures](https://www.efl.com/news/2026/june/25/the-2026-27-efl-fixtures-are-here/), and [FA National League System allocations](https://www.thefa.com/news/2026/may/14/nls-club-allocations-2026-27). The full reference arrays are in [english-pyramid.js](../source/dist/english-pyramid.js).

Real clubs supply the tier membership and broad level reference. In-game
opponents, names, rosters, match ratings and individual attributes are
fictional. The opposition report's 1–99 positional overall is calculated from
the game's fictional player attributes; FotMob is a scouting benchmark and not
a live source or a copied individual rating feed. Attribute averages rise by
tier. See [the five-tier model and save migration](FIVE_TIER_PYRAMID_AND_FINANCE.md).

Player portraits use locally cached original fictional atlases: 28 portraits in
the original sheet and 64 additional cells in the expanded sheet. New Tottunham
starters and the initial transfer targets retain their fixed original portraits;
opposition starters receive distinct faces, and other generated players use a
deterministic identity mapping. The companion atlas is WebP-encoded for a smaller
offline download. See the [original portrait prompt](../source/player-faces-v13-original-prompt.txt)
and [expanded portrait and club-scene prompts](CLUB_VISUALS_2026-10-08.md).
