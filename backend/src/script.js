// script.js

// Grab DOM elements
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const output = document.getElementById("output");

let mediaRecorder;
let audioChunks = [];

// When "Start Recording" is clicked:
startBtn.addEventListener("click", async () => {
  try {
    // Reset audio chunks at the beginning of recording
    audioChunks = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Try to use a more compatible format if available
    const mimeType = MediaRecorder.isTypeSupported("audio/mp3")
      ? "audio/mp3"
      : MediaRecorder.isTypeSupported("audio/mp4")
      ? "audio/mp4"
      : "audio/webm";

    console.log(`Using mime type: ${mimeType}`);
    mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
        console.log(`Data chunk added: ${event.data.size} bytes`);
      }
    };

    // Start recording and request data every 1 second (1000ms)
    mediaRecorder.start(1000);
    startBtn.disabled = true;
    stopBtn.disabled = false;
  } catch (error) {
    console.error("Error accessing microphone:", error);
    alert(
      "Error accessing microphone. Please ensure you have granted microphone permissions."
    );
  }
});

// When "Stop & Summarize" is clicked:
stopBtn.addEventListener("click", async () => {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    console.log("MediaRecorder is not active");
    return;
  }

  // Request final data chunk before stopping
  if (mediaRecorder.state === "recording") {
    mediaRecorder.requestData();
  }

  // Stop the recorder after a short delay to ensure the last chunk is captured
  setTimeout(() => {
    mediaRecorder.stop();
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }, 100);

  mediaRecorder.onstop = async () => {
    try {
      console.log(
        `Recording stopped, mime type: ${mediaRecorder.mimeType}, chunks: ${audioChunks.length}`
      );
      const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
      const formData = new FormData();

      // Use appropriate extension based on mime type
      const fileExt = mediaRecorder.mimeType.includes("mp3")
        ? "mp3"
        : mediaRecorder.mimeType.includes("mp4")
        ? "mp4"
        : "webm";

      formData.append("audio", audioBlob, `recording.${fileExt}`);

      // First, get the transcription
      const transcribeResponse = await fetch("/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!transcribeResponse.ok) {
        throw new Error(
          `Transcription failed: ${transcribeResponse.statusText}`
        );
      }

      const transcribeData = await transcribeResponse.json();

      // Then, get the summary
      const summarizeResponse = await fetch("/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript: transcribeData.transcript }),
      });
      const summarizeData = await summarizeResponse.json();

      // Display the results
      output.textContent = `Transcript: ${transcribeData.transcript}\n\nSummary: ${summarizeData.summary}`;
    } catch (error) {
      console.error("Error processing audio:", error);
      output.textContent = "Error processing audio. Please try again.";
    }

    // Reset for next recording
    audioChunks = [];
  };
});
