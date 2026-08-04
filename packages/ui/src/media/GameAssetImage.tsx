import { useEffect, useState, type ImgHTMLAttributes, type ReactNode } from "react";

const MAX_RETAINED_GAME_ASSETS = 384;
const retainedGameAssets = new Map<string, HTMLImageElement>();
const pendingGameAssets = new Map<string, HTMLImageElement>();

export type GameAssetImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> & {
  src?: string | null;
  fallback?: ReactNode;
};

export function GameAssetImage({
  src,
  fallback = null,
  decoding = "async",
  loading = "lazy",
  onLoad,
  ...imageProps
}: GameAssetImageProps) {
  const normalizedSrc = src?.trim() || undefined;
  const [failedSrc, setFailedSrc] = useState<string>();
  const wasRetained = normalizedSrc ? retainedGameAssets.has(normalizedSrc) : false;

  useEffect(() => {
    setFailedSrc(undefined);
    if (!normalizedSrc) return;

    touchRetainedGameAsset(normalizedSrc);
    if (loading === "eager") preloadGameAsset(normalizedSrc);
  }, [loading, normalizedSrc]);

  if (!normalizedSrc || failedSrc === normalizedSrc) {
    return <>{fallback}</>;
  }

  return (
    <img
      {...imageProps}
      src={normalizedSrc}
      decoding={decoding}
      loading={wasRetained ? "eager" : loading}
      onLoad={(event) => {
        retainGameAsset(normalizedSrc, event.currentTarget);
        onLoad?.(event);
      }}
      onError={() => {
        retainedGameAssets.delete(normalizedSrc);
        pendingGameAssets.delete(normalizedSrc);
        setFailedSrc(normalizedSrc);
      }}
    />
  );
}

function preloadGameAsset(src: string) {
  if (typeof Image === "undefined" || retainedGameAssets.has(src) || pendingGameAssets.has(src)) return;

  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    pendingGameAssets.delete(src);
    retainGameAsset(src, image);
  };
  image.onerror = () => {
    pendingGameAssets.delete(src);
  };
  pendingGameAssets.set(src, image);
  image.src = src;
}

function touchRetainedGameAsset(src: string) {
  const image = retainedGameAssets.get(src);
  if (!image) return;
  retainedGameAssets.delete(src);
  retainedGameAssets.set(src, image);
}

function retainGameAsset(src: string, image: HTMLImageElement) {
  retainedGameAssets.delete(src);
  retainedGameAssets.set(src, image);

  while (retainedGameAssets.size > MAX_RETAINED_GAME_ASSETS) {
    const oldestSrc = retainedGameAssets.keys().next().value;
    if (typeof oldestSrc !== "string") break;
    retainedGameAssets.delete(oldestSrc);
  }
}
