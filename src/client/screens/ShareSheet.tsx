// W10 · Share confirm (COM-2.1, COM-2.7): the exact server-drawn image and text, and a clear note
// that it posts from the player's account. Nothing is posted without "Post comment".
import { useEffect, useState } from 'react';
import type { SharePreview } from '../../shared/api.ts';
import { useApp } from '../app-context.ts';
import { Button, Loading, Sheet } from '../components/ui.tsx';
import { copy, fmt } from '../copy.ts';
import { ApiFailure, get, post } from '../lib/api.ts';
import { toast } from '../lib/platform.ts';

export const ShareSheet = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const app = useApp();
  const [preview, setPreview] = useState<SharePreview | null>(null);
  const [state, setState] = useState<'idle' | 'posting' | 'done' | 'error'>(
    'idle'
  );

  useEffect(() => {
    if (!open) return;
    let live = true;
    get<SharePreview>('/share').then(
      (p) => live && setPreview(p),
      () => live && setState('error')
    );
    return () => {
      live = false;
    };
  }, [open]);

  const postIt = async (): Promise<void> => {
    setState('posting');
    try {
      await post('/share');
      setState('done');
      toast(copy.share.done);
      app.announce(copy.share.done);
    } catch (e) {
      setState(
        e instanceof ApiFailure && e.code === 'conflict' ? 'done' : 'error'
      );
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={copy.share.title}>
      <p className="mb-3 text-sm text-ink-soft">
        {fmt(copy.share.body, { name: app.init.user.name ?? '' })}
      </p>
      {preview === null && state !== 'error' && <Loading />}
      {preview !== null && (
        <figure className="mb-3 flex flex-col gap-2">
          <img
            src={preview.image}
            alt={preview.text}
            className="mx-auto w-full max-w-[280px] rounded-[4px] border border-parchment-dark"
          />
          <figcaption className="text-center italic">
            “{preview.text}”
          </figcaption>
        </figure>
      )}
      {state === 'error' && (
        <p className="mb-3 text-seal" role="alert">
          {copy.err.network}
        </p>
      )}
      {state === 'done' || preview?.shared === true ? (
        <div className="flex flex-col gap-2">
          <p role="status">
            {state === 'done' ? copy.share.done : copy.share.already}
          </p>
          <Button onClick={onClose}>{copy.common.close}</Button>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{copy.share.cancel}</Button>
          <Button
            kind="gold"
            disabled={preview === null || state === 'posting'}
            onClick={() => void postIt()}
          >
            {copy.share.post}
          </Button>
        </div>
      )}
    </Sheet>
  );
};
