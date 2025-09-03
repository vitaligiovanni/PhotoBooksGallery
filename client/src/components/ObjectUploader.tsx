import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * A file upload component that renders as a button and provides a modal interface for
 * file management.
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: ['image/*'], // Only allow images
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: async (file) => {
          try {
            const params = await onGetUploadParameters();
            console.log("Got upload parameters:", params);
            return {
              method: params.method,
              url: params.url,
              fields: {},
            };
          } catch (error) {
            console.error("Error getting upload parameters:", error);
            throw error;
          }
        },
      })
      .on("complete", (result) => {
        console.log("Uppy complete result:", result);
        onComplete?.(result);
        setShowModal(false);
      })
  );

  return (
    <div>
      <Button 
        onClick={() => setShowModal(true)} 
        className={buttonClassName}
        type="button"
      >
        {children}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
        showProgressDetails={true}
        closeModalOnClickOutside={true}
        locale={{
          strings: {
            'dropPasteFiles': 'Перетащите файлы сюда или %{browseFiles}',
            'browseFiles': 'выберите',
            'uploadComplete': 'Загрузка завершена',
            'uploadPaused': 'Загрузка приостановлена',
            'resumeUpload': 'Продолжить загрузку',
            'pauseUpload': 'Приостановить загрузку',
            'retryUpload': 'Повторить загрузку',
            'cancelUpload': 'Отменить загрузку',
          }
        }}
      />
    </div>
  );
}