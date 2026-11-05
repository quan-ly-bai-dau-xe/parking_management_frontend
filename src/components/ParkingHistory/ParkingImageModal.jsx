import { useState } from "react";
import { ConfirmModal } from "../common";

function ModalImagePreview({ url, label, licensePlate, sessionCode }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const hasError = failedUrl === url;

  if (!url) {
    return (
      <div>
        <p className="mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <div className="overflow-hidden rounded-xl bg-slate-100 flex items-center justify-center p-4 min-h-[140px] border border-slate-200">
          <p className="text-xs text-slate-400">Không có dữ liệu hình ảnh</p>
        </div>
      </div>
    );
  }

  const handleError = () => {
    console.warn(
      `⚠️ [Modal Image Load Fallback] Không thể tải ảnh chi tiết trong modal (sử dụng giao diện thay thế):`,
      {
        sessionCode,
        licensePlate,
        label,
        targetUrl: url,
        timestamp: new Date().toISOString(),
      }
    );
    setFailedUrl(url);
  };

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <div className="overflow-hidden rounded-xl bg-slate-100 flex items-center justify-center p-2 min-h-[140px] border border-slate-200">
        {hasError ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <svg className="h-8 w-8 text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs font-semibold text-slate-600">Không thể tải hình ảnh</p>
            <p className="text-[11px] text-slate-400 max-w-xs truncate mt-0.5" title={url}>URL: {url}</p>
          </div>
        ) : (
          <img
            src={url}
            alt={`${label} - ${licensePlate}`}
            className="w-full max-h-[300px] object-contain"
            onError={handleError}
          />
        )}
      </div>
    </div>
  );
}

export default function ParkingImageModal({ previewSession, onClose }) {
  return (
    <ConfirmModal
      isOpen={Boolean(previewSession)}
      onClose={onClose}
      title={`Hình ảnh đối soát camera${previewSession?.licensePlate ? ` — ${previewSession.licensePlate}` : ""}`}
      size="lg"
      showFooter={false}
    >
      <div className="mt-1 space-y-4">
        {previewSession?.entryUrl && (
          <ModalImagePreview
            url={previewSession.entryUrl}
            label="Ảnh lúc vào"
            licensePlate={previewSession.licensePlate}
            sessionCode={previewSession.sessionCode}
          />
        )}
        {previewSession?.exitUrl && (
          <ModalImagePreview
            url={previewSession.exitUrl}
            label="Ảnh lúc ra"
            licensePlate={previewSession.licensePlate}
            sessionCode={previewSession.sessionCode}
          />
        )}
        {!previewSession?.entryUrl && !previewSession?.exitUrl && (
          <p className="py-8 text-center text-sm text-slate-400">Không có hình ảnh đối soát.</p>
        )}
      </div>
    </ConfirmModal>
  );
}
