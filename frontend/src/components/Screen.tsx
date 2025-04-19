import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useTakePicture from "../hooks/useTakePicture";

interface ScreenProps {
  onCapture: (picture: Blob, audio: Blob) => void;
}

export default function Screen({ onCapture }: ScreenProps) {
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

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const pictureBlob = await takePicture();
        onCapture(pictureBlob, audioBlob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <>
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
              onClick={toggleRecording}
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            ></canvas>
            
            <button
              onClick={toggleRecording}
              className={`
        fixed bottom-8 left-1/2 -translate-x-1/2 z-10 
        w-16 h-16 rounded-full 
        bg-purple-500 hover:bg-purple-600 
        flex items-center justify-center 
        shadow-lg transition-colors
        ${isRecording ? "pulse-recording" : ""}
      `}
              aria-label={isRecording ? "Stop Recording" : "Start Recording"}
            >
              {isRecording ? <Mic className="w-8 h-8 text-white" /> : <MicOff className="w-8 h-8 text-white" />}
              <style>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.7);
          }
          70% {
            box-shadow: 0 0 0 15px rgba(168, 85, 247, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(168, 85, 247, 0);
          }
        }
        .pulse-recording {
          animation: pulse 2s infinite;
        }
      `}</style>
            </button>
          </>
        )}
      </div>
    </>
  );
}
