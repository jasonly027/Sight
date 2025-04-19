import { useState } from "react";
import CameraView from "./components/CameraView";
import RecordButton from "./components/RecordButton";
import ResponseBox from "./components/ResponseBox";
import axios from "axios";

axios.defaults.baseURL = "http://localhost:3000"

export default function App() {
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setIsLoading(true);
    
    // Here you would implement the logic to:
    // 1. Send the audio recording to speech-to-text
    // 2. Process the camera feed with computer vision
    // 3. Generate a response
    // For now, we'll just show a placeholder response
    setTimeout(() => {
      setResponse("I can see what appears to be your surroundings. Feel free to ask specific questions about what you see.");
      setIsLoading(false);
    }, 1500);
  };
  
  return (
    <div className="fixed inset-0 bg-slate-900">
      <CameraView />
      <RecordButton onRecordingComplete={handleRecordingComplete} />
      <ResponseBox text={response} isLoading={isLoading} />
      
    </div>
  );
}
