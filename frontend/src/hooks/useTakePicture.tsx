import { DispatchWithoutAction, RefObject, useCallback } from "react";

export default function useTakePicture(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>
): DispatchWithoutAction {
  const takeScreenshot = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    
    ctx?.drawImage(videoRef.current, 0, 0);
    console.log(canvasRef.current.toDataURL("image/png"));
  }, [canvasRef, videoRef]);

  return takeScreenshot;
}
