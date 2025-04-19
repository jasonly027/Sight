import express from "express";

const app = express();
const PORT = 8080;

app.get("/", (req, res) => {
  res.send("HelloWorld");
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:8080`);
});
