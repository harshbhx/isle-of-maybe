// "Delete my chart" (COM-1.6): the author removes their own chart after a confirm sheet that says
// exactly what happens. Devvit Rules: users must be able to remove their own content.
import { useState } from 'react';
import { useApp } from '../app-context.ts';
import { copy } from '../copy.ts';
import { post } from '../lib/api.ts';
import { toast } from '../lib/platform.ts';
import { Button, Sheet } from './ui.tsx';

export const DeleteChart = ({
  chartId,
  onDeleted,
  className = '',
}: {
  chartId: string;
  onDeleted?: () => void;
  className?: string;
}) => {
  const app = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const go = async (): Promise<void> => {
    setBusy(true);
    try {
      await post('/chart/delete', { chartId });
      toast(copy.chart.deleted);
      app.announce(copy.chart.deleted);
      setOpen(false);
      void app.refresh();
      onDeleted?.();
    } catch {
      toast(copy.err.network);
    }
    setBusy(false);
  };
  return (
    <>
      <Button
        kind="quiet"
        className={`text-sm text-ink-soft ${className}`}
        onClick={() => setOpen(true)}
      >
        {copy.chart.delete}
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={copy.chart.deleteTitle}
      >
        <p className="mb-4 text-ink">{copy.chart.deleteBody}</p>
        <div className="flex gap-2">
          <Button
            kind="danger"
            className="flex-1"
            disabled={busy}
            onClick={() => void go()}
          >
            {copy.chart.deleteYes}
          </Button>
          <Button kind="ink" className="flex-1" onClick={() => setOpen(false)}>
            {copy.common.close}
          </Button>
        </div>
      </Sheet>
    </>
  );
};
