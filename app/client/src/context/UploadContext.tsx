import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  folderId: string | null;
  progress: number; // 0 to 100
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  cancel: () => void;
}

interface UploadContextType {
  queue: UploadItem[];
  isUploading: boolean;
  activeCount: number;
  completedCount: number;
  totalProgress: number;
  uploadFiles: (files: File[], folderId: string | null, onFinish?: () => void) => Promise<void>;
  extractZip: (file: File, folderId: string | null, onFinish?: () => void) => Promise<void>;
  cancelItem: (id: string) => void;
  cancelAll: () => void;
  clearCompleted: () => void;
}

const UploadContext = createContext<UploadContextType | null>(null);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<UploadItem[]>([]);

  const activeCount = useMemo(() => queue.filter(q => q.status === 'uploading').length, [queue]);
  const completedCount = useMemo(() => queue.filter(q => q.status === 'completed').length, [queue]);
  const isUploading = activeCount > 0;

  const totalProgress = useMemo(() => {
    if (queue.length === 0) return 0;
    const total = queue.reduce((acc, item) => acc + item.progress, 0);
    return Math.round(total / queue.length);
  }, [queue]);

  const cancelItem = useCallback((id: string) => {
    setQueue(prev => {
      const item = prev.find(i => i.id === id);
      if (item && item.status === 'uploading') {
        item.cancel();
      }
      return prev.map(i => i.id === id ? { ...i, status: 'cancelled' } : i);
    });
  }, []);

  const cancelAll = useCallback(() => {
    setQueue(prev => {
      prev.forEach(item => {
        if (item.status === 'uploading') item.cancel();
      });
      return prev.map(item => item.status === 'uploading' ? { ...item, status: 'cancelled' } : item);
    });
  }, []);

  const clearCompleted = useCallback(() => {
    setQueue(prev => prev.filter(i => i.status === 'uploading' || i.status === 'pending'));
  }, []);

  const uploadFiles = useCallback(async (files: File[], folderId: string | null, onFinish?: () => void) => {
    const newItems: UploadItem[] = files.map(file => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      let xhr: XMLHttpRequest | null = null;
      return {
        id,
        name: file.name,
        size: file.size,
        folderId,
        progress: 0,
        status: 'pending',
        cancel: () => {
          if (xhr) xhr.abort();
        },
      };
    });

    setQueue(prev => [...newItems, ...prev]);

    // Process files sequentially or in parallel chunks
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const item = newItems[i];

      await new Promise<void>(resolve => {
        const xhr = new XMLHttpRequest();
        item.cancel = () => xhr.abort();

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: pct, status: 'uploading' } : q));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: 100, status: 'completed' } : q));
          } else {
            let errMsg = 'Upload failed';
            try { errMsg = JSON.parse(xhr.responseText)?.error || errMsg; } catch {}
            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'failed', error: errMsg } : q));
          }
          resolve();
        };

        xhr.onerror = () => {
          setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'failed', error: 'Network error' } : q));
          resolve();
        };

        xhr.onabort = () => {
          setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'cancelled' } : q));
          resolve();
        };

        const form = new FormData();
        form.append('file', file);
        if (folderId) form.append('folder_id', folderId);
        if (file.webkitRelativePath) form.append('relative_path', file.webkitRelativePath);

        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'uploading' } : q));
        xhr.open('POST', '/api/files', true);
        xhr.withCredentials = true;
        xhr.send(form);
      });
    }

    if (onFinish) onFinish();
  }, []);

  const extractZip = useCallback(async (file: File, folderId: string | null, onFinish?: () => void) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let xhr: XMLHttpRequest | null = null;
    const item: UploadItem = {
      id,
      name: `Extract: ${file.name}`,
      size: file.size,
      folderId,
      progress: 0,
      status: 'pending',
      cancel: () => {
        if (xhr) xhr.abort();
      },
    };

    setQueue(prev => [item, ...prev]);

    await new Promise<void>(resolve => {
      xhr = new XMLHttpRequest();
      item.cancel = () => xhr?.abort();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 90);
          setQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: pct, status: 'uploading' } : q));
        }
      };

      xhr.onload = () => {
        if (xhr && xhr.status >= 200 && xhr.status < 300) {
          setQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: 100, status: 'completed' } : q));
        } else {
          let errMsg = 'Extraction failed';
          try { if (xhr) errMsg = JSON.parse(xhr.responseText)?.error || errMsg; } catch {}
          setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'failed', error: errMsg } : q));
        }
        resolve();
      };

      xhr.onerror = () => {
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'failed', error: 'Network error' } : q));
        resolve();
      };

      xhr.onabort = () => {
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'cancelled' } : q));
        resolve();
      };

      const form = new FormData();
      form.append('file', file);
      if (folderId) form.append('folder_id', folderId);

      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'uploading' } : q));
      xhr.open('POST', '/api/files/extract-zip', true);
      xhr.withCredentials = true;
      xhr.send(form);
    });

    if (onFinish) onFinish();
  }, []);

  return (
    <UploadContext.Provider value={{
      queue,
      isUploading,
      activeCount,
      completedCount,
      totalProgress,
      uploadFiles,
      extractZip,
      cancelItem,
      cancelAll,
      clearCompleted,
    }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error('useUpload must be used within an UploadProvider');
  return ctx;
}
