import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FolderPlus, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export default function CreateFolderModal({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onCreate(name.trim());
      setName('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setName('');
    setError('');
    onClose();
  }

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
                <FolderPlus size={20} className="text-yellow-400" />
                New Folder
              </Dialog.Title>
              <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Folder name"
                className="input-field w-full mb-4"
                maxLength={64}
              />
              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={handleClose} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
                  {loading ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
