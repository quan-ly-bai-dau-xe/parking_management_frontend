import { useMemo } from "react";
import { buildQrSvgPath, generateQrMatrix } from "../../utils/qrCodeSvg";

/**
 * Inline pure-SVG QR Code component (zero external library dependencies).
 */
export default function QrCodeSvg({
  value,
  size = 148,
  margin = 2,
  fgColor = "#0F172A",
  bgColor = "#FFFFFF",
  className = "",
  title = "Mã QR đăng ký nhanh",
}) {
  const qrData = useMemo(() => {
    if (!value) return null;
    try {
      const { size: matrixSize, modules } = generateQrMatrix(value);
      return {
        viewBoxSize: matrixSize + margin * 2,
        pathData: buildQrSvgPath(modules, margin),
      };
    } catch {
      return null;
    }
  }, [value, margin]);

  if (!qrData) return null;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={`0 0 ${qrData.viewBoxSize} ${qrData.viewBoxSize}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={title}
      className={className}
    >
      <rect
        width={qrData.viewBoxSize}
        height={qrData.viewBoxSize}
        fill={bgColor}
      />
      <path d={qrData.pathData} fill={fgColor} />
    </svg>
  );
}
