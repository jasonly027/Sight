import { RefObject, useCallback } from "react";

export default function useTakePicture(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>
): () => Promise<Blob> {
  const takeScreenshot = useCallback(async (): Promise<Blob> => {
    if (!videoRef.current || !canvasRef.current) return Promise.reject("ref parameters are null");

    const ctx = canvasRef.current.getContext("2d");

    ctx?.drawImage(videoRef.current, 0, 0);

    return new Promise((resolve, reject) => {
      canvasRef.current?.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject("Failed to create blob");
        }
      });
    });
  }, [canvasRef, videoRef]);

  return takeScreenshot;
}
