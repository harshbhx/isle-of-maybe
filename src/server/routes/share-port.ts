// Devvit implementation of sharing: upload the server-drawn PNG, then comment as the user.
import { RichTextBuilder, media, reddit } from '@devvit/web/server';
import { isT1 } from '@devvit/web/shared';
import type { SharePort } from '../services/share.ts';

export const sharePort: SharePort = {
  upload: async (dataUrl) =>
    (await media.upload({ url: dataUrl, type: 'image' })).mediaUrl,
  comment: async (parentId, text, mediaUrl) => {
    if (!isT1(parentId)) throw new Error(`not a comment id: ${parentId}`);
    const comment = await reddit.submitComment({
      id: parentId,
      richtext: new RichTextBuilder()
        .image({ mediaUrl })
        .paragraph((p) => p.text({ text })),
      runAs: 'USER',
    });
    return comment.id;
  },
};
