// Devvit implementation of the daily job's Reddit calls: create the island post, sticky the thread.
import { context, reddit } from '@devvit/web/server';
import { isT3 } from '@devvit/web/shared';
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
};
