import { useState } from "react";
import ResponseBox from "./components/ResponseBox";
import Screen from "./components/Screen";
import axios from "axios";

// Consider making this configurable via environment variables for flexibility
const BACKEND_URL = "https://172.20.10.2:3000";

export default function App() {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);

  const onCapture = (pictureBlob: Blob, audioBlob: Blob) => {
    setIsLoading(true);

    const formData = new FormData();
    formData.append("image", pictureBlob);
    formData.append("audio", audioBlob);
    console.log("Sending data to:", `${BACKEND_URL}/master`);
    console.log(pictureBlob, audioBlob);

    axios
      // Use the correct network IP address of your backend server
      .post(`${BACKEND_URL}/master`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((resp) => {
        console.log("Backend response:", resp);
        setResponse(resp.data.summary);
        if (resp.data.audio) {
          const audioUrl = `data:audio/mpeg;base64,${resp.data.audio}`;
          setAudioDataUrl(audioUrl);
        } else {
          setAudioDataUrl(null);
        }
      })
      .catch((err) => {
        console.error("Error sending data to backend:", err);
        // Log more details if available
        if (err.response) {
          console.error("Error response data:", err.response.data);
          console.error("Error response status:", err.response.status);
          console.error("Error response headers:", err.response.headers);
        } else if (err.request) {
          console.error("Error request:", err.request);
        } else {
          console.error("Error message:", err.message);
        }
        setResponse("Error connecting to backend. Check console."); // Provide user feedback
        setAudioDataUrl(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div className="fixed inset-0 bg-slate-900">
      <Screen onCapture={onCapture} />
      <ResponseBox text={response} isLoading={isLoading} />
      {audioDataUrl && (
        <audio key={audioDataUrl} autoPlay controls src={audioDataUrl}>
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );
}
