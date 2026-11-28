# 06 — Copy

Voice: short, salty, kind. Tease the map, never the player. Every string lives in `src/client/copy.ts` under these keys. English only (the rules require English).

## Splash
| Key | Text |
|---|---|
| splash.title | Isle of Maybe |
| splash.day | Day {n} · {island} |
| splash.counts | {buried} chests buried · {found} found |
| splash.yourChart | Your chart from Day {n}: {finds} found |
| splash.first | Be the first to bury a chest today. |
| splash.cta | Set sail |
| splash.oldDay | This is Day {n}. Today's island is Day {today} → |

## Modifiers
| Key | Text |
|---|---|
| mod.clear | Clear skies: you can see 4 tiles. |
| mod.twins | Twins: some landmarks have a double. Chart carefully. |
| mod.lowtide | Low tide: the island is bigger today. |
| mod.jungle | Thick jungle: more paths are blocked. |
| mod.fog | Sea fog: you can see 2 tiles. Trust the map. |
| mod.lanterns | Lantern night: landmarks glow through the fog. |
| mod.storm | Storm: one landmark gets knocked over at noon (UTC). |

## Hints (each shown once)
| Key | Text |
|---|---|
| hint.pick | Strangers drew these from memory. Pick one. |
| hint.hunt | Tap the island to walk. Open the chart any time. |
| hint.dig | You have 3 shovels. Dig where the X says. |
| hint.bury | You can only bury where you've been. Deeper pays more. |
| hint.chart | Now draw the way. From memory. |

## Pick
| Key | Text |
|---|---|
| pick.title | Pick a chart to follow |
| pick.trusted | Trusted |
| pick.fresh | Fresh |
| pick.captain | Old Captain |
| pick.captainNote | The island's own chart. Old, but honest-ish. |
| pick.challenged | u/{name} challenged you to find their chest |
| pick.follow | Follow this chart |
| pick.attempts | {n} sailors tried · {f} found |

## Hunt
| Key | Text |
|---|---|
| hunt.dig | Dig |
| hunt.giveup | Give up |
| hunt.shovels | {n} shovels left |
| hunt.steps | {n} steps |
| hunt.miss1 | Just sand. |
| hunt.miss2 | More sand. The map looks smug. |
| hunt.chartOpen | Chart |
| hunt.report | Report chart |

## Reveal
| Key | Text |
|---|---|
| reveal.found | You found u/{name}'s chest! |
| reveal.foundCaptain | You found the Old Captain's chest! |
| reveal.gold | +{gold} gold |
| reveal.missed | The map was {d} paces off. |
| reveal.missedClose | So close. {d} paces. |
| reveal.missedFar | {d} paces. Was this map drawn upside down? |
| reveal.rate | Rate this chart |
| reveal.true | True map |
| reveal.cursed | Cursed map |
| reveal.skip | Skip |

## Bury and chart
| Key | Text |
|---|---|
| bury.title | Bury your chest |
| bury.depth.shallow | Shallow · ×1 |
| bury.depth.buried | Buried · ×2 |
| bury.depth.deep | Deep · ×3 |
| bury.depthNote | Pays {m}× to you and to whoever finds it. |
| bury.cta | Bury it here |
| bury.login | Log in to bury a chest and see who finds it tomorrow. |
| chart.title | Chart it |
| chart.budget | {s} of 6 stamps · {p} of 8 path steps |
| chart.needX | Every chart needs an X. |
| chart.submit | Submit chart |
| chart.path | Path |
| chart.x | X |
| ink.sharp | Sharp |
| ink.steady | Steady |
| ink.wobbly | Wobbly |
| ink.cursed | Cursed |
| ink.line | Your X is {d} paces off. Tomorrow you'll see how real sailors did. |
| ink.lineSharp | Right on the money. Tomorrow you'll see how real sailors did. |

## Result
| Key | Text |
|---|---|
| result.found | Found u/{name}'s chest · {steps} steps |
| result.missed | Missed u/{name}'s chest |
| result.yourChest | Your chest: {depth} · Ink: {grade} |
| result.live | {n} sailors picked up your chart |
| result.again | Hunt another chart ({n} left) |
| result.share | Share my chart |
| result.challenge | Challenge a friend |
| result.boards | Leaderboards |
| result.join | Join the crew |
| result.done | That's today's sailing. New island at {time} your time. |

## Share
| Key | Text |
|---|---|
| share.title | Share your chart? |
| share.body | This posts a comment from your account (u/{name}) under today's chart thread, with this image. |
| share.comment | Buried a {depth} chest on {island}. Can you read my map? ({depth} = shallow / well-buried / deep; built on the server, COM-2.7) |
| share.post | Post comment |
| share.cancel | Cancel |
| share.done | Posted. Sailors can find it under today's chart thread. |
| challenge.text | I buried a chest on {island}. Here's my map. Bet you can't find it. |

## Dispatch and boards
| Key | Text |
|---|---|
| dispatch.title | Dispatch |
| dispatch.line | {tried} tried · {found} found |
| dispatch.salvage | +{gold} salvage gold |
| dispatch.sample | Tomorrow, this is where you'll learn how your chart did. |
| tier.deckhand | Deckhand |
| tier.mapmaker | Mapmaker |
| tier.navigator | Navigator |
| tier.cartographer | Cartographer |
| tier.legend | Legend of the Isles |
| boards.today | Today |
| boards.week | This week |
| boards.carto | Cartographers |
| boards.hall | Hall of Charts |

## Errors
| Key | Text |
|---|---|
| err.network | Lost at sea. Try again. |
| err.quota | The ship's log is full. Your hunt still counts. |
| err.generic | Something snapped a rope. Try again. |
| err.reported | Thanks. We'll take a look at that chart. |

## Daily post and sticky comment (server)
- Post title: `Isle of Maybe · Day {n} — {island}`
- Sticky comment: `🗺️ Chart shares for Day {n} go here. Share yours from inside the game: it replies to this comment from your account.`

## Moderator review (server)
| Key | Text |
|---|---|
| Menu item | Isle of Maybe: Review reported charts |
| reviewEmpty | No reported charts to review. |
| reviewTitle | Review reported charts |
| reviewDescription | These charts were hidden after 3 player reports. Restore puts a chart back; Delete removes it for good. |
| reviewCharts / reviewAction | Charts / Action |
| reviewRestore / reviewDelete | Restore / Delete |
| reviewOption | `u/{author} · {day} · {n} reports` |
| reviewRestored / reviewDeleted | Restored {n} chart(s). / Deleted {n} chart(s). |
| reviewNone | Pick at least one chart. |


## Client extras (labels the wireframes imply; same voice)
| Key | Text |
|---|---|
| splash.tagline | Bury it. Chart it. Trust a stranger's map. |
| splash.streak / splash.gold | {n}-day streak / {n} gold (screen-reader labels) |
| pick.fresh0 | New · nobody has tried it yet |
| pick.none | You've hunted every chart you can today. |
| pick.prev / pick.next | Previous chart / Next chart |
| hunt.chartClose | Hide chart |
| hunt.zoomIn / hunt.zoomOut | Zoom in / Zoom out |
| hunt.walking | Walking… |
| hunt.confirmGiveup | Give up and see where the chest was? |
| reveal.rated | Thanks for rating. |
| reveal.buryCta / reveal.again / reveal.results | Bury your chest / Hunt another chart / See results |
| reveal.chartX / reveal.chest | Chart's X / Chest (map legend) |
| bury.loginCta / bury.browse / bury.pickTile | Log in / Just browse / Tap a tile you've walked near. |
| chart.undo / chart.clear / chart.remove / chart.stamps | Undo / Clear / Remove / Stamps |
| ink.continue | Continue |
| result.tomorrow / result.countdown | Tomorrow's island / Lands in {t} (DAY-7.1) |
| result.streak / result.total / result.noChest | Streak {n} / {n} gold total / No chest buried yet. |
| share.already | Already shared under today's chart thread. |
| dispatch.sampleTitle / dispatch.tier / dispatch.tierTop / dispatch.cta | Sample / {tier} · {finds} / {next} finds / {tier} · {finds} finds / Today's island → |
| boards.trusted / boards.empty / boards.you / boards.cursed / boards.back | Most trusted charts / Nobody here yet. Be the first. / You / Cursed Map of the Day / Back |
| practice.* | Practice Cove / A tiny island and a perfect map. 45 seconds. / Try it / Skip / You can read a map. Now the real island. |
| common.* | Reading the charts… / Back / Close / Sound / Charted by u/{name} / Charted by u/{name} · Day {n} / Charted by the Old Captain |
| landmark.* | Palm, Twin palms, Boulder, Skull rock, Hut, Wreck, Well, Statue, Campfire, Cave |
| err.retry | Try again |
| resultLine.* | Isle of Maybe · Day {n} / Found a chest with {n} shovels / Missed after {n} shovels / Buried a {depth} chest / Ink: {grade} (COM-2.6, joined with ·) |
