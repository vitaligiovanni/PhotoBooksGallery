import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X } from "lucide-react";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  accept?: string;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: { successful: Array<{ uploadURL: string }> }) => void;
  onFilesAdded?: (previews: string[]) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  accept = "image/*",
  onGetUploadParameters,
  onComplete,
  onFilesAdded,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList) => {
    if (!files.length) return;

    // Convert FileList to array and limit to maxNumberOfFiles
    const fileArray = Array.from(files).slice(0, maxNumberOfFiles);
    
    // Check each file before upload
    for (const file of fileArray) {
      // Check file size
      if (file.size > maxFileSize) {
        alert(t('fileTooLarge', { fileName: file.name, maxSize: Math.round(maxFileSize / 1024 / 1024) }));
        return;
      }

      // Check file type based on accept prop
      if (accept === "image/*" && !file.type.startsWith('image/')) {
        alert(t('onlyImages'));
        return;
      }
      if (accept === "video/*" && !file.type.startsWith('video/')) {
        alert(t('onlyVideos'));
        return;
      }
    }

    // Create preview URLs immediately and call onFilesAdded
    if (onFilesAdded) {
      const previews = fileArray.map(file => URL.createObjectURL(file));
      onFilesAdded(previews);
    }

    setIsUploading(true);
    const successfulUploads: { uploadURL: string }[] = [];
    
    try {
      console.log(`Starting upload of ${fileArray.length} files...`);
      
      // Upload each file sequentially
      for (const file of fileArray) {
        console.log(`Uploading file: ${file.name}`);
        
        // Используем POST запрос с FormData вместо PUT с сырым файлом
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch('/api/local-upload', {
          method: "POST",
          body: formData,
        });

        console.log(`Upload response for ${file.name}:`, response.status, response.statusText);

        if (response.ok) {
          const result = await response.json();
          console.log(`Upload successful for ${file.name}, URL:`, result.url);
          successfulUploads.push({
            uploadURL: result.url
          });
        } else {
          throw new Error(`Upload failed for ${file.name}: ${response.statusText}`);
        }
      }

      // Call onComplete with all successful uploads
      if (successfulUploads.length > 0) {
        console.log(`All uploads completed successfully. ${successfulUploads.length} files uploaded.`);
        onComplete?.({
          successful: successfulUploads
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(t('uploadError'));
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
            {t("uploading")}
          </>
        ) : (
          children
        )}
      </Button>
      
      <Input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        multiple={maxNumberOfFiles > 1}
      />
    </div>
  );
}
