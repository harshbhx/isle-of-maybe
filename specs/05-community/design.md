# 05 · Community — design

- Reports: `hSetNX chart:{c}:reporters {u} 1` then `hIncrBy chart:{c}:stats reports 1`; at 3 → `hSet chart:{c} hidden 1`, `zAdd reports:queue`.
- Mod review: menu item → `showForm`-style form (`devvit.json` forms) listing up to 20 queued charts as select options with actions Restore / Delete.
- Share: `GET /api/share` returns `{ image, text }` for the player's chart on this post: the server draws it (`src/server/render/`: parchment, coastline, dock, stamps, path, X; 8-bit indexed PNG, 800×800, pure TypeScript, no canvas) and builds the text from `share.comment`. The confirm sheet shows exactly that. `POST /api/share` re-renders, `media.upload`s the data URL, and posts `reddit.submitComment({ id: shareStickyId, richtext: image + text, runAs: 'USER' })`. Store `sharecomment:{commentId} → chartId` and `chart:{c}.shareCommentId`. Why server-side: until app approval, `runAs: 'USER'` posts from the **app account**, so a client-supplied image would let anyone post any picture as the app (red team, Nov 28).
- Challenge: `showShareSheet({ title, text: copy.challenge.text, data: JSON.stringify({ type: 'challenge', chartId }) })`; receiver reads `getShareData()` and passes `chartId` to the picker (validated server-side).
- Boards: zsets `board:gold:{d}`, `board:gold:w{week}`, `board:cartographers`, `charts:{d}:trust`; own rank via `zRank` + `zScore`.
- Realtime: `realtime.send('day-' + yyyymmdd, msg)`; client `connectRealtime` in splash and result card only (not during the hunt).
- Flair: `reddit.setUserFlairBatch(sub, [{ username, text }])`.
- Delete triggers: `onPostDelete` → look up `day:{d}` by postId index (`postday:{postId}` → d); `onCommentDelete` → `sharecomment:{commentId}` → chartId.
