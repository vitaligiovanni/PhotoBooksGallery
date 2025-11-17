import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import QRCode from 'qrcode';

// Minimalist, responsive upload modal component with local-only backend integration
// - Calls GET /api/tunnel to fetch loca.lt URL (backend auto-starts tunnel when ENABLE_LOCALTUNNEL=true)
// - Uploads files via POST /api/upload (multer array under 'files')
// - Lists uploaded thumbnails via GET /api/uploads
//
// How to test on a phone:
// 1) In backend/.env set ENABLE_LOCALTUNNEL=true and (optionally) LOCALTUNNEL_SUBDOMAIN=your-name
// 2) Start backend (npm run dev) and frontend (npm run dev) in two terminals.
// 3) Open the modal on desktop; it will show a QR with the loca.lt URL. Scan it with your phone.
//    If tunnel disabled, run in another terminal: npm run tunnel (in frontend) or npx localtunnel --port 3000
// 4) On the phone, open the URL; the same UI should be reachable.

export type UploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type UploadedItem = { url: string; name: string; size?: number; type?: string };

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [progress, setProgress] = useState<number[]>([]);
  const [status, setStatus] = useState<'idle'|'uploading'|'success'|'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const [tunnelUrl, setTunnelUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadedItem[]>([]);

  // Responsive grid column count
  const gridCols = useMemo(() => {
    if (typeof window === 'undefined') return 2;
    const w = window.innerWidth;
    if (w < 360) return 2;
    if (w < 600) return 3;
    if (w < 900) return 4;
    return 6;
  }, []);

  const refreshTunnel = useCallback(async () => {
    try {
      const resp = await fetch('/api/tunnel');
      const data = await resp.json();
      if (data?.enabled && data?.url) {
        setTunnelUrl(data.url);
        const qr = await QRCode.toDataURL(data.url, { width: 256, margin: 1 });
        setQrDataUrl(qr);
      } else {
        setTunnelUrl(null);
        setQrDataUrl(null);
      }
    } catch {
      setTunnelUrl(null);
      setQrDataUrl(null);
    }
  }, []);

  const loadUploads = useCallback(async () => {
    try {
      const resp = await fetch('/api/uploads');
      const data = await resp.json();
      if (Array.isArray(data?.files)) setUploaded(data.files);
    } catch {}
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    refreshTunnel();
    loadUploads();
  }, [isOpen, refreshTunnel, loadUploads]);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles(accepted);
    setPreviews(accepted.map((f) => URL.createObjectURL(f)));
    setProgress(accepted.map(() => 0));
    setStatus('idle');
    setMessage('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
    maxFiles: 100,
    maxSize: 15 * 1024 * 1024,
  } as any);

  const uploadFiles = async () => {
    if (files.length === 0) return;
    setStatus('uploading');
    setMessage('📸 Загружаем ваши фото...');

    // Build FormData
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));

    try {
      // Use XMLHttpRequest to track progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload');
        xhr.upload.onprogress = (e) => {
          if (!e.lengthComputable) return;
          const pct = Math.round((e.loaded / e.total) * 100);
          // Update all as a simple overall indicator
          setProgress((prev) => prev.map(() => pct));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (Array.isArray(data?.files)) {
                setUploaded((u) => [...data.files, ...u]);
              }
            } catch {}
            resolve();
          } else {
            reject(new Error('Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(fd);
      });

      setStatus('success');
      setMessage('✅ Фото загружено. Можете отправлять или добавить ещё');
      await loadUploads();
    } catch (e) {
      console.error(e);
      setStatus('error');
      setMessage('⚠️ Ошибка при загрузке. Попробуйте снова');
    }
  };

  const resetAll = () => {
    setFiles([]);
    setPreviews([]);
    setProgress([]);
    setStatus('idle');
    setMessage('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative mx-3 w-full max-w-3xl rounded-2xl bg-white p-4 shadow-2xl md:p-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold md:text-xl">Загрузка фотографий</h3>
              <button
                onClick={() => { resetAll(); onClose(); }}
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            {/* Tunnel + QR (desktop only visible prominently) */}
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <div
                  {...getRootProps()}
                  className={`flex h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-gray-200 text-center transition ${isDragActive ? 'bg-gray-50' : 'bg-white'}`}
                >
                  <input {...(getInputProps() as any)} />
                  <div className="text-sm text-gray-600">
                    {isDragActive ? 'Отпустите файлы здесь…' : 'Перетащите фото сюда'}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">или</div>
                  <button className="mt-2 rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white shadow-sm">Выбрать фото</button>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR" className="h-24 w-24 rounded-md border" />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-md border text-xs text-gray-400">Нет QR</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs text-gray-500">{tunnelUrl || '🔒 Подключение к телефону временно недоступно'}</div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={refreshTunnel} className="rounded-full border px-3 py-1 text-xs">Обновить</button>
                      <a
                        href={tunnelUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className={`rounded-full px-3 py-1 text-xs ${tunnelUrl ? 'bg-black text-white' : 'bg-gray-200 text-gray-500 pointer-events-none'}`}
                      >Открыть</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Previews grid */}
            {previews.length > 0 && (
              <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
                {previews.map((src, i) => (
                  <div key={i} className="overflow-hidden rounded-lg border">
                    <img src={src} alt="preview" className="h-24 w-full object-cover md:h-28" />
                    <div className="p-2 text-xs text-gray-500 truncate">{files[i]?.name}</div>
                    <div className="h-1 w-full bg-gray-100">
                      <motion.div
                        className="h-1 bg-black"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(0, progress[i] || 0)}%` }}
                        transition={{ ease: 'easeOut', duration: 0.3 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Status */}
            {status !== 'idle' && (
              <div className={`mt-3 text-sm ${status === 'error' ? 'text-red-600' : 'text-gray-700'}`}>{message}</div>
            )}

            {/* Actions */}
            <div className="mt-4 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button onClick={resetAll} className="rounded-full border px-4 py-2 text-sm">Очистить</button>
              <button onClick={uploadFiles} disabled={files.length === 0} className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white disabled:bg-gray-300">{status === 'uploading' ? 'Загрузка…' : 'Отправить'}</button>
            </div>

            {/* Uploaded thumbnails (recent) */}
            {uploaded.length > 0 && (
              <div className="mt-6">
                <div className="mb-2 text-sm font-medium text-gray-700">Загруженные фото</div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {uploaded.slice(0, 24).map((f, i) => (
                    <img key={i} src={f.url} alt={f.name} className="h-20 w-full rounded-md object-cover" />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default UploadModal;
