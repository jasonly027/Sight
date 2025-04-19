import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface RecordButtonProps {
  onRecordingComplete: (audio: Blob) => void;
}

const RecordButton = ({ onRecordingComplete }: RecordButtonProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        onRecordingComplete(blob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
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
      {isRecording ? <Mic className="w-8 h-8 text-white" /> : <MicOff  className="w-8 h-8 text-white" />}
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
  );
};

export default RecordButton;
