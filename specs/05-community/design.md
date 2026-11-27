# 05 · Community — design

- Reports: `hSetNX chart:{c}:reporters {u} 1` then `hIncrBy chart:{c}:stats reports 1`; at 3 → `hSet chart:{c} hidden 1`, `zAdd reports:queue`.
- Mod review: menu item → `showForm`-style form (`devvit.json` forms) listing up to 20 queued charts as select options with actions Restore / Delete.
- Share: client renders `chart/toPng.ts` (SVG → canvas 800×800 → PNG data URL ≤ 1.5 MB) → `POST /api/chart/share` → `media.upload` → `reddit.submitComment({ id: shareStickyId, richtext, runAs: 'USER' })`. Store `shareCommentId`. Note: until app approval, comments come from the app account (expected).
- Challenge: `showShareSheet({ title, text: copy.challenge.text, data: JSON.stringify({ type: 'challenge', chartId }) })`; receiver reads `getShareData()` and passes `chartId` to the picker (validated server-side).
- Boards: zsets `board:gold:{d}`, `board:gold:w{week}`, `board:cartographers`, `charts:{d}:trust`; own rank via `zRank` + `zScore`.
- Realtime: `realtime.send('day-' + yyyymmdd, msg)`; client `connectRealtime` in splash and result card only (not during the hunt).
- Flair: `reddit.setUserFlairBatch(sub, [{ username, text }])`.
- Delete triggers: `onPostDelete` → look up `day:{d}` by postId index (`postday:{postId}` → d); `onCommentDelete` → `sharecomment:{commentId}` → chartId.
