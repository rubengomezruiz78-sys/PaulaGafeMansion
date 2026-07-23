import type { CSSProperties, ImgHTMLAttributes } from "react";

type ApkImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  fill?: boolean;
  priority?: boolean;
};

export default function ApkImage({ fill, priority, style, alt = "", ...props }: ApkImageProps) {
  const imageStyle: CSSProperties | undefined = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style }
    : style;
  // This adapter intentionally renders a native image inside the offline Android WebView.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={alt} style={imageStyle} loading={priority ? "eager" : "lazy"} decoding="async" />;
}
