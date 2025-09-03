import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X } from "lucide-react";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: { successful: Array<{ uploadURL: string }> }) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList) => {
    if (!files.length) return;

    const file = files[0];
    
    // Check file size
    if (file.size > maxFileSize) {
      alert(`Файл слишком большой. Максимальный размер: ${Math.round(maxFileSize / 1024 / 1024)}MB`);
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Можно загружать только изображения');
      return;
    }

    setIsUploading(true);
    
    try {
      console.log('Getting upload parameters...');
      const uploadParams = await onGetUploadParameters();
      console.log('Upload params received:', uploadParams);

      console.log('Starting upload...');
      const response = await fetch(uploadParams.url, {
        method: uploadParams.method,
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      console.log('Upload response:', response.status, response.statusText);

      if (response.ok) {
        console.log('Upload successful, calling onComplete with URL:', uploadParams.url);
        onComplete?.({
          successful: [{
            uploadURL: uploadParams.url
          }]
        });
      } else {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Ошибка загрузки файла');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleUpload(files);
    }
  };

  return (
    <div>
      <Button 
        onClick={handleButtonClick} 
        className={buttonClassName}
        type="button"
        disabled={isUploading}
      >
        {isUploading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Загрузка...
          </>
        ) : (
          children
        )}
      </Button>
      
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        multiple={maxNumberOfFiles > 1}
      />
    </div>
  );
}