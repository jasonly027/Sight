import { useState } from "react";
import ResponseBox from "./components/ResponseBox";
import Screen from "./components/Screen";
import axios from "axios";

export default function App() {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);

  const onCapture = (pictureBlob: Blob, audioBlob: Blob) => {
    setIsLoading(true);

    const formData = new FormData();
    formData.append("image", pictureBlob);
    formData.append("audio", audioBlob);
    console.log(pictureBlob, audioBlob);

    axios
      .post("http://localhost:3000/master", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((resp) => {
        console.log(resp);
        setResponse(resp.data.summary);
        if (resp.data.audio) {
          const audioUrl = `data:audio/mpeg;base64,${resp.data.audio}`;
          setAudioDataUrl(audioUrl);
        } else {
          setAudioDataUrl(null);
        }
      })
      .catch((err) => {
        console.log(err);
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
        <audio
          key={audioDataUrl}
          autoPlay
          controls
          src={audioDataUrl}
          className="hidden"
        >
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );
}
