// The moderator review form (COM-1.3): built from the queue, parsed on submit. No Devvit runtime
// imports, so it can be tested on its own.
import type { UiResponse } from '@devvit/web/shared';
import { serverCopy } from '../copy.ts';
import type { QueuedChart, ReviewAction } from '../services/reports.ts';
import { isRecord } from '../store/guards.ts';

export const REVIEW_FORM = 'reviewForm';

export const reviewFormFor = (queue: readonly QueuedChart[]): UiResponse => {
  if (queue.length === 0) return { showToast: serverCopy.reviewEmpty };
  return {
    showForm: {
      name: REVIEW_FORM,
      form: {
        title: serverCopy.reviewTitle,
        description: serverCopy.reviewDescription,
        fields: [
          {
            type: 'select',
            name: 'charts',
            label: serverCopy.reviewCharts,
            multiSelect: true,
            required: true,
            options: queue.map((q) => ({
              label: serverCopy.reviewOption(q.author, q.day, q.reports),
              value: q.id,
            })),
          },
          {
            type: 'select',
            name: 'action',
            label: serverCopy.reviewAction,
            required: true,
            defaultValue: ['restore'],
            options: [
              { label: serverCopy.reviewRestore, value: 'restore' },
              { label: serverCopy.reviewDelete, value: 'delete' },
            ],
          },
        ],
      },
    },
  };
};

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];

/** Read the submitted form; select fields arrive as string lists. */
export const parseReview = (
  body: unknown
): { chartIds: string[]; action: ReviewAction } | null => {
  if (!isRecord(body)) return null;
  const chartIds = strings(body.charts);
  const action = strings(body.action)[0];
  if (chartIds.length === 0) return null;
  if (action !== 'restore' && action !== 'delete') return null;
  return { chartIds, action };
};

export const STATS_FORM = 'statsForm';

/** Read-only stats for moderators (SHIP-3.1): one line per day in the form description. */
export const statsFormFor = (lines: readonly string[]): UiResponse => ({
  showForm: {
    name: STATS_FORM,
    form: {
      title: serverCopy.statsTitle,
      description: lines.join('\n'),
      fields: [],
      acceptLabel: serverCopy.statsClose,
    },
  },
});
