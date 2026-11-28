# 05 · Community — requirements

Scope: safety, moderation, boards, sharing, live activity and flair. Source: PRD §5.7, §5.9, §9; red team C-1, C-2, C-4; Devvit rules (`docs/11-AGENT-KNOWLEDGE.md` §F, §H).

## COM-1 Reports and moderation
- **COM-1.1** THE client SHALL show "Charted by u/{name}" on every player chart and a Report button wherever a chart is shown.
- **COM-1.2** WHEN a player reports a chart, THE server SHALL record one report per player per chart; WHEN a chart reaches 3 reports, THE server SHALL hide it and add it to the review queue.
- **COM-1.3** WHERE a moderator opens "Review reported charts", THE moderator tools SHALL list hidden charts (author, day, report count) and let the moderator restore or delete each.
- **COM-1.4** WHEN a day's post is deleted, THE server SHALL delete that day's charts, stats and indexes.
- **COM-1.5** THE server SHALL expire all player-created data within 30 days.

## COM-2 Sharing
- **COM-2.1** WHEN a player taps "Share my chart", THE client SHALL show a confirm sheet stating that a comment will be posted from their account, with a preview image and the exact text.
- **COM-2.2** WHEN the player confirms, THE server SHALL render the chart image itself from the stored chart (never from client-supplied pixels or text), upload it and post it as the user (`runAs: 'USER'`) as a reply to the day's share sticky, at most once per chart unless the earlier comment was deleted.
- **COM-2.7** THE server SHALL provide the exact image and comment text for the confirm sheet, so the preview always matches what gets posted.
- **COM-2.3** THE client SHALL never require sharing, commenting or subscribing to continue, and SHALL keep each as a separate button.
- **COM-2.4** WHEN a player taps "Challenge a friend", THE client SHALL open Reddit's share sheet with share data `{ type: 'challenge', chartId }` (≤ 1,024 characters).
- **COM-2.5** WHEN a shared comment is deleted, THE server SHALL clear the stored link to it.
- **COM-2.8** THE result card SHALL offer "Join the crew" as a separate, optional link that opens the subreddit (`navigateTo`), where the player subscribes with Reddit's own Join button. THE app SHALL NOT call a subscribe API: until the app version is approved, `runAs: 'USER'` acts as the app account.
- **COM-2.6** (P1) THE client SHALL build a spoiler-free result line (day, shovels used, found or missed, depth, Ink grade; never coordinates or landmark positions) used in shares and challenges.

## COM-3 Leaderboards
- **COM-3.1** THE server SHALL provide boards: Today's most trusted charts (≥ 3 attempts), Today's gold, This week's gold (Mon–Sun UTC), Cartographers (all-time finds).
- **COM-3.2** THE server SHALL return the top 10 and the requesting player's rank and value even outside the top 10.
- **COM-3.3** THE server SHALL exclude Old Captain charts from chart boards.

## COM-4 Hall of Charts
- **COM-4.1** THE client SHALL show, for each past day, the top 3 trusted charts as read-only parchments with author and stats.
- **COM-4.2** THE server SHALL never reveal chest positions in the Hall.
- **COM-4.3** THE Hall SHALL respect hidden charts.
- **COM-4.4** (P1) THE Hall SHALL show a "Cursed Map of the Day": the chart with the lowest find rate among charts with ≥ 5 attempts.

## COM-5 Live activity (P1)
- **COM-5.1** WHEN a chest is found or buried, THE server SHALL send a realtime message on channel `day-{YYYYMMDD}`.
- **COM-5.2** WHILE connected, THE client SHALL show a ticker and update counters within 2 seconds; WHERE realtime fails, THE client SHALL refresh counters on open.

## COM-6 Flair (P2)
- **COM-6.1** WHEN the daily job runs, THE server SHALL set user flair to the tier text for players whose tier changed, in batches of ≤ 100.
