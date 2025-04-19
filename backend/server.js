// server.js
import express from "express";
import multer from "multer";
import OpenAI from "openai";
import fs from "fs";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
const app = express();
const upload = multer();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Serve static files from the root directory
app.use(express.static(__dirname));

app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    // Create a temp file from buffer with a .mp3 extension (OpenAI handles this better)
    const tempFilePath = join(__dirname, "recording.mp3");
    fs.writeFileSync(tempFilePath, req.file.buffer);

    console.log(
      `Sending file: ${tempFilePath} (${req.file.mimetype}, ${req.file.size} bytes)`
    );

    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: "whisper-1",
      });

      // Clean up the temp file
      fs.unlinkSync(tempFilePath);

      res.json({ transcript: transcription.text });
    } catch (apiError) {
      console.error("OpenAI API Error:", apiError);

      // Try again with different file extension if first attempt failed
      if (tempFilePath.endsWith("mp3")) {
        const wavPath = join(__dirname, "recording.wav");
        fs.writeFileSync(wavPath, req.file.buffer);

        try {
          const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(wavPath),
            model: "whisper-1",
          });

          fs.unlinkSync(wavPath);
          return res.json({ transcript: transcription.text });
        } catch (secondError) {
          console.error("Second attempt failed:", secondError);
          fs.unlinkSync(wavPath);
          throw apiError; // Throw original error
        }
      } else {
        throw apiError;
      }
    }
  } catch (error) {
    console.error("Transcription error:", error);
    res.status(500).json({ error: "Error processing audio transcription" });
  }
});

app.use(express.json());

app.post("/summarize", async (req, res) => {
  const { transcript } = req.body;
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful summarization assistant." },
      { role: "user", content: `Summarize the following:\n\n${transcript}` },
    ],
  });
  res.json({ summary: completion.choices[0].message.content });
});

app.use(express.json()); // parse JSON bodies

app.post("/tts", async (req, res) => {
  const { text } = req.body;

  // 1. Call OpenAI TTS API
  const ttsResponse = await openai.audio.speech.create({
    model: "tts-1", // real‑time model :contentReference[oaicite:7]{index=7}
    input: text,
    voice: "alloy", // choose any supported voice
    format: "mp3",
  });

  // 2. Stream MP3 back to client
  res.set("Content-Type", "audio/mpeg");
  const arrayBuffer = await ttsResponse.arrayBuffer();
  res.send(Buffer.from(arrayBuffer));
});

app.use(express.json());

app.post("/image-classifier", async (req, res) => {
  try {
    const { img } = req.body;

    if (!img) {
      return res.status(400).json({ error: "No image data provided" });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Describe this image in detail." },
            {
              type: "image_url",
              image_url: {
                url: img,
              },
            },
          ],
        },
      ],
    });

    res.json({
      description: response.choices[0].message.content,
    });
  } catch (error) {
    console.error("Image classification error:", error);
    res.status(500).json({ error: "Error processing image classification" });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
