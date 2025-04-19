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

  const onCapture = async (pictureBlob: Blob, audioBlob: Blob) => {
    setIsLoading(true);

    // 1) Create an Audio instance and call play() immediately
    //    to "unlock" playback under iOS/WebKit's gesture requirement.
    const audioPlayer = new Audio();
    audioPlayer.play().catch(() => {
      // it'll fail silently if no src yet, but will unlock the gesture
    });

    const formData = new FormData();
    formData.append("image", pictureBlob);
    formData.append("audio", audioBlob);

    try {
      const resp = await axios.post(`${BACKEND_URL}/master`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log("Backend response:", resp);
      setResponse(resp.data.summary);

      if (resp.data.audio) {
        const audioUrl = `data:audio/mpeg;base64,${resp.data.audio}`;
        setAudioDataUrl(audioUrl);

        // 2) Set the blob on our unlocked Audio instance and play it
        audioPlayer.src = audioUrl;
        await audioPlayer.play().catch((err) => {
          console.error("Playback failed:", err);
        });
      } else {
        setAudioDataUrl(null);
      }
    } catch (err: unknown) {
      console.error("Error sending data to backend:", err);
      if (axios.isAxiosError(err) && err.response) {
        console.error("Error response data:", err.response.data);
      }
      setResponse("Error connecting to backend. Check console.");
      setAudioDataUrl(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900">
      <Screen onCapture={onCapture} />
      <ResponseBox text={response} isLoading={isLoading} />

      {/* still show controls in case the user wants them */}
      {audioDataUrl && (
        <audio key={audioDataUrl} autoPlay controls src={audioDataUrl}>
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );
}
