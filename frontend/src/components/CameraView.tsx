import { useEffect, useRef, useState } from "react";
import useTakePicture from "../hooks/useTakePicture";

interface CameraViewProps {
  onPictureTaken: (picture: Blob) => void;
}

export default function CameraView({ onPictureTaken }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const takePicture = useTakePicture(videoRef, canvasRef);

  const [error, setError] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      if (!canvasRef.current || !videoRef.current) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (!canvasRef.current || !videoRef.current) return;

          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        };
      } catch (err) {
        setError(true);
        console.error("Error accessing camera:", err);
      }
    };

    startCamera();

    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="w-full h-full">
      {error ? (
        <div className="flex items-center justify-center h-screen bg-slate-900 text-white p-4 text-center">
          Camera access denied. Please enable camera permissions.
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="size-full"
            onClick={async () => {
              const blob = await takePicture();
              onPictureTaken(blob);
            }}
          />
          <canvas
            ref={canvasRef}
            className="hidden"
          ></canvas>
        </>
      )}
    </div>
  );
}
