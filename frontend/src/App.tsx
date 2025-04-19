import { useState } from "react";
import ResponseBox from "./components/ResponseBox";
import Screen from "./components/Screen";
import axios from "axios";

export default function App() {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onCapture = (pictureBlob: Blob, audioBlob: Blob) => {
    setIsLoading(true);

    const formData = new FormData();
    formData.append("picture", pictureBlob);
    formData.append("audio", audioBlob);

    axios.post("localhost:3000/master", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }).then(() => {

    });

    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900">
      <Screen onCapture={onCapture} />
      <ResponseBox
        text={response}
        isLoading={isLoading}
      />
    </div>
  );
}
