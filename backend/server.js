// server.js
import express from "express";
import multer from "multer";
import OpenAI from "openai";
import fs from "fs";
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

// app.post("/transcribe", upload.single("audio"), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "No audio file provided" });
//     }

//     // Create a temp file from buffer with a .mp3 extension (OpenAI handles this better)
//     const tempFilePath = join(__dirname, "recording.mp3");
//     fs.writeFileSync(tempFilePath, req.file.buffer);

//     console.log(
//       `Sending file: ${tempFilePath} (${req.file.mimetype}, ${req.file.size} bytes)`
//     );

//     try {
//       const transcription = await openai.audio.transcriptions.create({
//         file: fs.createReadStream(tempFilePath),
//         model: "whisper-1",
//       });

//       // Clean up the temp file
//       fs.unlinkSync(tempFilePath);

//       res.json({ transcript: transcription.text });
//     } catch (apiError) {
//       console.error("OpenAI API Error:", apiError);

//       // Try again with different file extension if first attempt failed
//       if (tempFilePath.endsWith("mp3")) {
//         const wavPath = join(__dirname, "recording.wav");
//         fs.writeFileSync(wavPath, req.file.buffer);

//         try {
//           const transcription = await openai.audio.transcriptions.create({
//             file: fs.createReadStream(wavPath),
//             model: "whisper-1",
//           });

//           fs.unlinkSync(wavPath);
//           return res.json({ transcript: transcription.text });
//         } catch (secondError) {
//           console.error("Second attempt failed:", secondError);
//           fs.unlinkSync(wavPath);
//           throw apiError; // Throw original error
//         }
//       } else {
//         throw apiError;
//       }
//     }
//   } catch (error) {
//     console.error("Transcription error:", error);
//     res.status(500).json({ error: "Error processing audio transcription" });
//   }
// });

// app.use(express.json());

// app.post("/summarize", async (req, res) => {
//   const { transcript } = req.body;
//   const completion = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     messages: [
//       { role: "system", content: "You are a helpful summarization assistant." },
//       { role: "user", content: `Summarize the following:\n\n${transcript}` },
//     ],
//   });
//   res.json({ summary: completion.choices[0].message.content });
// });

// app.post("/tts", async (req, res) => {
//   const { text } = req.body;

//   // 1. Call OpenAI TTS API
//   const ttsResponse = await openai.audio.speech.create({
//     model: "tts-1", // real‑time model :contentReference[oaicite:7]{index=7}
//     input: text,
//     voice: "alloy", // choose any supported voice
//     format: "mp3",
//   });

//   // 2. Stream MP3 back to client
//   res.set("Content-Type", "audio/mpeg");
//   const arrayBuffer = await ttsResponse.arrayBuffer();
//   res.send(Buffer.from(arrayBuffer));
// });

// app.post("/image-classifier", async (req, res) => {
//   try {
//     const { img } = req.body;

//     if (!img) {
//       return res.status(400).json({ error: "No image data provided" });
//     }

//     const response = await openai.chat.completions.create({
//       model: "gpt-4o",
//       messages: [
//         {
//           role: "user",
//           content: [
//             { type: "text", text: "Describe this image in detail." },
//             {
//               type: "image_url",
//               image_url: {
//                 url: img,
//               },
//             },
//           ],
//         },
//       ],
//     });

//     res.json({
//       description: response.choices[0].message.content,
//     });
//   } catch (error) {
//     console.error("Image classification error:", error);
//     res.status(500).json({ error: "Error processing image classification" });
//   }
// });

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
            content: "You are a helpful summarization assistant.",
          },
          {
            role: "user",
            content: `Summarize the following combined audio and image information:\n\n${combinedInput}`,
          },
        ],
      });

      const summary = summaryResponse.choices[0].message.content;

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

app.listen(3000, () => console.log("Server running on port 3000"));
