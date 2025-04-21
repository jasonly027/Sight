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
import { exec } from "child_process";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
const app = express();
app.use(cors());

const upload = multer();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function runYolo(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      if (stderr) {
        console.warn("YOLO stderr:", stderr);
      }
      resolve(stdout); // return stdout
    });
  });
}

// Function to transcribe audio
async function transcribeAudio(audioBuffer) {
  const tempFilePathMp3 = join(__dirname, `recording-${Date.now()}.mp3`);
  fs.writeFileSync(tempFilePathMp3, audioBuffer);

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePathMp3),
      model: "whisper-1",
    });
    fs.unlinkSync(tempFilePathMp3);
    console.log("Transcript: " + transcription.text);
    return transcription.text;
  } catch (audioError) {
    console.error("Audio transcription error (MP3):", audioError);
    fs.unlinkSync(tempFilePathMp3); // Clean up mp3 file

    // Try again with WAV format
    const tempFilePathWav = join(__dirname, `recording-${Date.now()}.wav`);
    fs.writeFileSync(tempFilePathWav, audioBuffer);
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePathWav),
        model: "whisper-1",
      });
      fs.unlinkSync(tempFilePathWav);
      console.log("Transcript (WAV attempt): " + transcription.text);
      return transcription.text;
    } catch (secondError) {
      console.error(
        "Second audio transcription attempt failed (WAV):",
        secondError
      );
      fs.unlinkSync(tempFilePathWav); // Clean up wav file
      // Re-throw the original error or a combined error if needed
      throw new Error("Audio transcription failed after multiple attempts.");
    }
  }
}

// Function to describe image
async function describeImage(imageBuffer, mimetype) {
  const base64Image = `data:${mimetype};base64,${imageBuffer.toString(
    "base64"
  )}`;
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
    max_tokens: 300, // Optional: constrain token usage if needed
  });
  console.log("Image Description:", imageResponse.choices[0].message.content);
  return imageResponse.choices[0].message.content;
}

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

      const audioBuffer = req.files.audio[0].buffer;
      const imageBuffer = req.files.image[0].buffer;
      const imageMimetype = req.files.image[0].mimetype;

      // Step 2 & 3: Transcribe audio and process image in parallel
      const [transcript, imageDescription] = await Promise.all([
        transcribeAudio(audioBuffer),
        describeImage(imageBuffer, imageMimetype),
      ]);

      //Step YOLO Process
      const imagePath = join(__dirname, "uploads.png"); // temp image file path
      fs.writeFileSync(imagePath, imageBuffer);
      console.log("\nTHE IMAGE" + imagePath);
      console.log("MIME" + req.files.image[0].mimetype + "\n");
      //const paths = path.toString; //relatuinve path
      const yoloModel = path.join(__dirname, "yolov5", "detect.py"); //making the actual path
      const command = `python  ${yoloModel} --save-txt --weights yolov5s.pt --source ${imagePath} --view-img`;
      await runYolo(command);
      let yoloResult = "nothing";
      //const yoloFile = '../yolov5/runs/detect/exp/labels/upload.txt';
      const yoloFile = path.join(
        __dirname,
        "yolov5",
        "runs",
        "detect",
        "exp",
        "labels",
        "uploads.txt"
      );
      fs.readFile(yoloFile, "utf8", (err, data) => {
        if (err) {
          console.error("Failed to read file:", err);
          return;
        }
        yoloResult = data;
        console.log("\n\n YOLO RESULT: " + yoloResult + "\n");
      });
      fs.unlinkSync(imagePath); //delete the image
      const yoloFile2 = path.join(__dirname, "yolov5", "runs", "detect", "exp");
      const deleteFolderRecursive = (folderPath) => {
        if (fs.existsSync(folderPath)) {
          fs.readdirSync(folderPath).forEach((file) => {
            const curPath = path.join(folderPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
              deleteFolderRecursive(curPath); // recurse
            } else {
              fs.unlinkSync(curPath); // delete file
            }
          });
          fs.rmdirSync(folderPath); // delete now-empty folder
        }
      };

      deleteFolderRecursive(yoloFile2);

      // Step 4: Generate summary based on transcript and image description
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
        yoloResult: yoloResult,
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
