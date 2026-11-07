import { useState } from "react";

/**
 * Thumbnail hình ảnh đối soát với chẩn đoán lỗi rõ ràng và UI fallback sạch.
 */
export default function ParkingSessionThumbnail({ item, onPreview }) {
  const imageUrl = item.plateImageUrl || item.exitPlateImageUrl;
  const [failedUrl, setFailedUrl] = useState(null);
  const hasError = failedUrl === imageUrl;

  if (!imageUrl) {
    return (
      <span
        className="flex h-10 w-14 flex-col items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-[9px] font-medium text-slate-400 select-none"
        title="Chưa có hình ảnh đối soát (ảnh null do chưa chụp hoặc lỗi tải lên Cloudinary)"
        data-testid="thumbnail-fallback-no-image"
      >
        <svg
          className="h-3.5 w-3.5 text-slate-400 mb-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span>Chưa có</span>
      </span>
    );
  }

  const handleImageError = () => {
    const isEntry = Boolean(item.plateImageUrl);
    console.warn(
      `⚠️ [Image Load Fallback] Không thể tải ảnh đối soát (sử dụng giao diện thay thế):`,
      {
        sessionCode: item.sessionCode,
        licensePlate: item.licensePlate,
        imageType: isEntry ? "Ảnh vào (entry)" : "Ảnh ra (exit)",
        targetUrl: imageUrl,
        timestamp: new Date().toISOString(),
      }
    );
    setFailedUrl(imageUrl);
  };

  return (
    <button
      type="button"
      onClick={() =>
        onPreview({
          entryUrl: item.plateImageUrl,
          exitUrl: item.exitPlateImageUrl,
          licensePlate: item.licensePlate,
          sessionCode: item.sessionCode,
        })
      }
      className="group relative block h-10 w-14 overflow-hidden rounded-md border border-slate-200 bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label={`Xem ảnh đối soát ${item.licensePlate}`}
    >
      {hasError ? (
        <span
          className="flex h-full w-full flex-col items-center justify-center bg-slate-100 p-1 text-[9px] font-medium text-slate-400 transition-colors group-hover:bg-slate-200"
          title={`Không thể tải ảnh từ: ${imageUrl}`}
        >
          <svg className="h-3.5 w-3.5 text-slate-400 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Ảnh lỗi
        </span>
      ) : (
        <img
          src={imageUrl}
          alt={`Ảnh đối soát ${item.licensePlate}`}
          className="h-full w-full object-cover transition-transform group-hover:scale-110"
          loading="lazy"
          onError={handleImageError}
        />
      )}
    </button>
  );
}
