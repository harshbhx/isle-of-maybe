// Devvit implementation of the daily job's Reddit calls: create the island post, sticky the thread,
// set tier flair.
import { context, reddit, settings } from '@devvit/web/server';
import { isT1, isT3 } from '@devvit/web/shared';
import type { DailyPort } from '../services/daily.ts';

export const redditPort: DailyPort = {
  createPost: async (title, postData) => {
    const post = await reddit.submitCustomPost({
      subredditName: context.subredditName,
      title,
      entry: 'default',
      postData,
    });
    return post.id;
  },
  stickyComment: async (postId, text) => {
    if (!isT3(postId)) throw new Error(`not a post id: ${postId}`);
    const comment = await reddit.submitComment({
      id: postId,
      text,
      runAs: 'APP',
    });
    await comment.distinguish(true);
    return comment.id;
  },
  crewGoal: async () => (await settings.get<number>('crewGoal')) ?? 50,
  replies: async (commentId) => {
    if (!isT1(commentId)) return [];
    const comment = await reddit.getCommentById(commentId);
    const list = await comment.replies.all();
    return list.slice(0, 500).map((r) => ({
      author: r.authorName,
      body: r.body,
      score: r.score,
      removed: r.removed,
    }));
  },
  setFlairs: async (rows) => {
    await reddit.setUserFlairBatch(context.subredditName, rows);
  },
};
