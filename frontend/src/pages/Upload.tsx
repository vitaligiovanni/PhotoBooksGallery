import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PHOTOBOOK_SIZES, PHOTOBOOK_FORMAT_LABELS, type PhotobookFormat } from "@shared/public";
import QRCode from "qrcode";
import { useLocation } from "wouter";

type PresignedUrl = {
  key: string;
  url: string;
  expiresAt: string | Date;
};

type CreateSessionResponse = {
  uploadId: string;
  session: {
    id: string;
    phone: string;
    format: string;
    size: string;
    pages: number;
    price: string;
    status: string;
  };
  urls: PresignedUrl[];
  maxFileSize: number;
  allowedTypes: string[];
  maxFiles: number;
};

type UploadedMeta = {
  key: string;
  filename: string;
  size: number;
  mimeType: string;
};

function isLocalPresigned(url: string) {
  return url.includes("/api/upload/local/");
}

export default function UploadPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"create" | "upload" | "complete">("create");
  const [phone, setPhone] = useState("");
  const [format, setFormat] = useState<PhotobookFormat>("square");
  const [size, setSize] = useState<string>("20x20");
  const [pages, setPages] = useState<number>(24);
  const [comment, setComment] = useState<string>("");
  const [estimatedFiles, setEstimatedFiles] = useState<number>(30);

  const [session, setSession] = useState<CreateSessionResponse | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [progress, setProgress] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const uploadedMetaRef = useRef<UploadedMeta[]>([]);

  // QR state (for opening on phone)
  const [qrUrl, setQrUrl] = useState<string>("");
  const [qrImage, setQrImage] = useState<string>("");
  const [qrLoading, setQrLoading] = useState<boolean>(false);

  // Initialize default size when format changes
  const availableSizes = PHOTOBOOK_SIZES[format];
  const sizeOptions = useMemo(() => availableSizes.map(s => ({
    value: `${s.width}x${s.height}`,
    label: s.label,
  })), [availableSizes]);

  // Ensure current size is valid for selected format
  const ensureSizeValid = useCallback(() => {
    if (!sizeOptions.find(s => s.value === size)) {
      setSize(sizeOptions[0]?.value || "20x20");
    }
  }, [size, sizeOptions]);

  // Dropzone setup
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!session) return;

    const limited = acceptedFiles.slice(0, session.urls.length);
    setFiles(limited);
    setPreviews(limited.map(f => URL.createObjectURL(f)));
    setProgress(Array(limited.length).fill(0));
  }, [session]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
      "image/heic": [],
      "image/tiff": [],
    },
    multiple: true,
    maxFiles: session?.maxFiles || 100,
    maxSize: session?.maxFileSize || 15 * 1024 * 1024,
  } as any);

  const handleCreateSession = async () => {
    try {
      ensureSizeValid();
      const res = await fetch("/api/upload/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          format,
          size,
          pages,
          comment: comment || undefined,
          estimatedFiles,
        }),
      });
      if (!res.ok) throw new Error(`Create session failed: ${res.status}`);
      const data: CreateSessionResponse = await res.json();
      setSession(data);
      setUploadId(data.uploadId);
      setStep("upload");
      // Allow resume via URL
      const url = new URL(window.location.href);
      url.searchParams.set("session", data.uploadId);
      window.history.replaceState({}, "", url.toString());
      // Prepare QR for phone open (same page on LAN)
      prepareQr();
    } catch (e) {
      console.error(e);
      alert("Не удалось создать сессию загрузки");
    }
  };

  // Fetch LAN hosts and build QR to /upload (with ?session if present)
  const prepareQr = useCallback(async () => {
    try {
      setQrLoading(true);
      const res = await fetch('/api/dev/host-info');
      if (res.ok) {
        const data = await res.json();
        const base: string = (data.hosts && data.hosts[0]) || `${window.location.origin}/upload`;
        const withSession = uploadId ? `${base}?session=${encodeURIComponent(uploadId)}` : base;
        setQrUrl(withSession);
        const dataUrl = await QRCode.toDataURL(withSession, { width: 256, margin: 1 });
        setQrImage(dataUrl);
      } else {
        const fallback = `${window.location.origin}/upload${uploadId ? `?session=${encodeURIComponent(uploadId)}` : ''}`;
        setQrUrl(fallback);
        const dataUrl = await QRCode.toDataURL(fallback, { width: 256, margin: 1 });
        setQrImage(dataUrl);
      }
    } catch (e) {
      const fallback = `${window.location.origin}/upload${uploadId ? `?session=${encodeURIComponent(uploadId)}` : ''}`;
      setQrUrl(fallback);
      try {
        const dataUrl = await QRCode.toDataURL(fallback, { width: 256, margin: 1 });
        setQrImage(dataUrl);
      } catch {}
    } finally {
      setQrLoading(false);
    }
  }, [uploadId]);

  // Also prepare QR on entering create step for users who prefer starting on phone
  useEffect(() => {
    if (step === 'create') {
      prepareQr();
    }
  }, [step, prepareQr]);

  const uploadSingle = async (file: File, urlInfo: PresignedUrl, index: number) => {
    return new Promise<void>(async (resolve, reject) => {
      try {
        if (isLocalPresigned(urlInfo.url)) {
          // Для локальной загрузки отправляем raw binary, а не FormData
          const resp = await fetch(urlInfo.url, {
            method: "PUT",
            headers: { "Content-Type": file.type || "application/octet-stream" },
            body: file,
          });
          if (!resp.ok) throw new Error(`Local upload failed: ${resp.status}`);
        } else {
          const resp = await fetch(urlInfo.url, {
            method: "PUT",
            headers: { "Content-Type": file.type || "application/octet-stream" },
            body: file,
          });
          if (!resp.ok) throw new Error(`Remote upload failed: ${resp.status}`);
        }
        uploadedMetaRef.current.push({
          key: urlInfo.key,
          filename: file.name,
          size: file.size,
          mimeType: file.type || "application/octet-stream",
        });
        setProgress(prev => {
          const next = [...prev];
          next[index] = 100;
          return next;
        });
        resolve();
      } catch (err) {
        console.error(err);
        setProgress(prev => {
          const next = [...prev];
          next[index] = -1; // error marker
          return next;
        });
        reject(err);
      }
    });
  };

  const handleStartUpload = async () => {
    if (!session || !uploadId) return;
    if (files.length === 0) {
      alert("Добавьте файлы для загрузки");
      return;
    }

    setIsUploading(true);
    uploadedMetaRef.current = [];

    const urls = session.urls.slice(0, files.length);

    // Limit concurrency
    const CONCURRENCY = 3;
    let idx = 0;
    const runNext = async (): Promise<void> => {
      if (idx >= files.length) return Promise.resolve();
      const current = idx++;
      await uploadSingle(files[current], urls[current], current);
      return runNext();
    };

    try {
      const workers = Array(Math.min(CONCURRENCY, files.length)).fill(0).map(() => runNext());
      try {
        await Promise.all(workers);
      } catch (e) {
        console.warn("Some uploads failed", e);
        // Continue to complete with whatever uploaded
      }
      const res = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId,
          files: uploadedMetaRef.current,
        }),
      });
      if (!res.ok) throw new Error(`Complete failed: ${res.status}`);
      const data = await res.json();
      console.log("Complete response", data);
      setStep("complete");
    } catch (e) {
      console.error(e);
      alert("Не удалось завершить загрузку");
    } finally {
      setIsUploading(false);
    }
  };

  // UI
  if (step === "create") {
    return (
      <div className="container mx-auto max-w-3xl p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Загрузка фотографий</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm mb-1 block">Телефон для связи</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+374 .." />
              </div>

              <div>
                <label className="text-sm mb-1 block">Формат</label>
                <Select value={format} onValueChange={(v) => setFormat(v as PhotobookFormat)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите формат" />
                  </SelectTrigger>
                  <SelectContent>
                    {(["square","album","book"] as PhotobookFormat[]).map(f => (
                      <SelectItem key={f} value={f}>{PHOTOBOOK_FORMAT_LABELS[f]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm mb-1 block">Размер</label>
                <Select value={size} onValueChange={(v) => setSize(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите размер" />
                  </SelectTrigger>
                  <SelectContent>
                    {sizeOptions.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm mb-1 block">Страниц</label>
                <Input type="number" value={pages} min={20} max={200} onChange={e => setPages(parseInt(e.target.value || "24", 10))} />
              </div>

              <div>
                <label className="text-sm mb-1 block">Ожидаемое кол-во файлов</label>
                <Input type="number" value={estimatedFiles} min={1} max={100} onChange={e => setEstimatedFiles(parseInt(e.target.value || "30", 10))} />
              </div>
            </div>

            <div>
              <label className="text-sm mb-1 block">Комментарий (необязательно)</label>
              <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Пожелания по заказу" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2 flex justify-end">
                <Button onClick={handleCreateSession} disabled={!phone || !format || !size}>Начать</Button>
              </div>
              <div className="border rounded-md p-3">
                <div className="text-sm font-medium mb-2">Открыть страницу на телефоне</div>
                {qrLoading ? (
                  <div className="text-xs text-muted-foreground">Готовим QR…</div>
                ) : qrImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={qrImage} alt="QR" className="w-40 h-40" />
                    <a href={qrUrl} target="_blank" className="text-xs break-all text-primary underline">{qrUrl}</a>
                    <div className="text-[11px] text-muted-foreground text-center">Телефон должен быть в той же Wi‑Fi сети. Если не открывается — проверьте брандмауэр.</div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Не удалось сформировать QR</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "upload" && session) {
    return (
      <div className="container mx-auto max-w-6xl p-4 md:p-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Сессия: {session.uploadId}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">Цена: {session.session.price} ֏ • Файлов слотов: {session.urls.length} • Лимит файла: {(session.maxFileSize/1024/1024).toFixed(0)} MB</div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div {...getRootProps()} className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer ${isDragActive ? 'border-primary bg-muted' : 'border-muted'}`}>
                  <input {...(getInputProps() as any)} multiple />
                  {isDragActive ? (
                    <p>Отпустите файлы здесь…</p>
                  ) : (
                    <p>Перетащите фото сюда или кликните для выбора</p>
                  )}
                </div>

                {files.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {files.map((file, i) => (
                      <div key={i} className="space-y-2">
                        <img src={previews[i]} alt={file.name} className="w-full h-32 object-cover rounded" />
                        <div className="text-xs truncate">{file.name}</div>
                        <Progress value={progress[i] < 0 ? 0 : progress[i]} />
                        {progress[i] < 0 && <div className="text-xs text-red-500">Ошибка</div>}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" onClick={() => { setFiles([]); setPreviews([]); setProgress([]); }}>Очистить</Button>
                  <Button onClick={handleStartUpload} disabled={isUploading || files.length === 0}>{isUploading ? 'Загрузка…' : 'Загрузить'}</Button>
                </div>
              </div>

              <div className="border rounded-md p-3">
                <div className="text-sm font-medium mb-2">Открыть сессию на телефоне</div>
                {qrLoading ? (
                  <div className="text-xs text-muted-foreground">Готовим QR…</div>
                ) : qrImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={qrImage} alt="QR" className="w-40 h-40" />
                    {qrUrl && <a href={qrUrl} target="_blank" className="text-xs break-all text-primary underline">{qrUrl}</a>}
                    <div className="text-[11px] text-muted-foreground text-center">Телефон должен быть в той же Wi‑Fi сети. Если не открывается — проверьте брандмауэр.</div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Не удалось сформировать QR</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "complete" && session) {
    const resumeUrl = `${window.location.origin}/upload?session=${uploadId}`;
    return (
      <div className="container mx-auto max-w-2xl p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Загрузка завершена</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Спасибо! Мы получили ваши фотографии. Менеджер свяжется с вами по телефону {session.session.phone}.</p>
            <div className="text-sm text-muted-foreground">ID сессии: {uploadId}</div>
            <div className="text-sm">Ссылка на сессию (для повторной загрузки при необходимости):<br />
              <a href={resumeUrl} className="text-primary underline">{resumeUrl}</a>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setLocation('/')}>На главную</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
