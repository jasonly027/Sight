import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name reliably in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: "0.0.0.0", // listen on all network interfaces
    https: {
      key: fs.readFileSync(
        path.resolve(__dirname, "../certs/172.16.4.178+3-key.pem")
      ),
      cert: fs.readFileSync(
        path.resolve(__dirname, "../certs/172.16.4.178+3.pem")
      ),
    },
  },
  plugins: [react(), tailwindcss()],
});
