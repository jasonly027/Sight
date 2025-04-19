// server.js
import express from "express";
import multer from "multer";
import OpenAI from "openai";
import fs from "fs";
import https from "https";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
const app = express();
app.use(cors());
const upload = multer();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Serve static files from the root directory
app.use(express.static(__dirname));

// New master endpoint that combines all functionalities
app.post(
  "/master",
  upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // Step 1: Check if all required files are provided
      if (!req.files.audio || !req.files.image) {
        return res
          .status(400)
          .json({ error: "Both audio and image files are required" });
      }

      // Step 2: Transcribe audio
      const audioBuffer = req.files.audio[0].buffer;
      const tempFilePath = join(__dirname, "recording.mp3");
      fs.writeFileSync(tempFilePath, audioBuffer);

      let transcript;
      try {
        const transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(tempFilePath),
          model: "whisper-1",
        });
        transcript = transcription.text;
        console.log("Transcript: " + transcript);
        fs.unlinkSync(tempFilePath);
      } catch (audioError) {
        console.error("Audio transcription error:", audioError);

        // Try again with different file extension if first attempt failed
        if (tempFilePath.endsWith("mp3")) {
          const wavPath = join(__dirname, "recording.wav");
          fs.writeFileSync(wavPath, audioBuffer);

          try {
            const transcription = await openai.audio.transcriptions.create({
              file: fs.createReadStream(wavPath),
              model: "whisper-1",
            });
            transcript = transcription.text;
            fs.unlinkSync(wavPath);
          } catch (secondError) {
            console.error("Second attempt failed:", secondError);
            fs.unlinkSync(wavPath);
            throw audioError;
          }
        } else {
          throw audioError;
        }
      }

      // Step 3: Process image
      const imageBuffer = req.files.image[0].buffer;
      const base64Image = `data:${
        req.files.image[0].mimetype
      };base64,${imageBuffer.toString("base64")}`;

      const imageResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Describe this image in detail." },
              {
                type: "image_url",
                image_url: {
                  url: base64Image,
                },
              },
            ],
          },
        ],
      });

      const imageDescription = imageResponse.choices[0].message.content;

      // Step 4: Summarize combined information
      const combinedInput = `Audio transcript: ${transcript}\n\nImage description: ${imageDescription}`;

      const summaryResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant designed specifically for a blind user. Your primary goal is to interpret audio and visual information to describe their immediate surroundings clearly, concisely, and accurately. Prioritize information crucial for awareness, orientation, and safety. Use simple, direct language. When applicable, provide directional cues relative to the user if inferrable. Avoid using bullet points, only use clear concise 1 to 2 sentences.`,
          },
          {
            role: "user",
            content: `Synthesize the information from the audio transcript and the image description below to provide a brief, informative update about the user's current environment. Highlight key objects, people, or potential hazards.\n\nAudio Transcript:\n${transcript}\n\nImage Description:\n${imageDescription}`,
          },
        ],
      });

      const summary = summaryResponse.choices[0].message.content;
      console.log("Summary: " + summary);

      // Step 5: Text-to-speech
      const ttsResponse = await openai.audio.speech.create({
        model: "tts-1",
        input: summary,
        voice: "alloy",
        format: "mp3",
      });

      const audioData = Buffer.from(await ttsResponse.arrayBuffer());

      // Step 6: Return combined results
      res.json({
        summary: summary,
        audio: audioData.toString("base64"),
      });
    } catch (error) {
      console.error("Master endpoint error:", error);
      res
        .status(500)
        .json({ error: "Error processing request", details: error.message });
    }
  }
);

// Load SSL certificate and key
// Replace with the actual paths to your certificate and key files
const options = {
  key: fs.readFileSync("../certs/172.20.10.2+3-key.pem"),
  cert: fs.readFileSync("../certs/172.20.10.2+3.pem"),
};

const PORT = 3000; // Use environment variable or default
const HOST = "0.0.0.0"; // Listen on all network interfaces

// Create HTTPS server instead of HTTP
https.createServer(options, app).listen(PORT, HOST, () => {
  console.log(`Server running securely on https://${HOST}:${PORT}`);
});
