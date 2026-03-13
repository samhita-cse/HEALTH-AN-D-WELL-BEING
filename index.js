const express = require("express");
const path = require("path");

const app = express();
const rootDir = __dirname;

app.use(express.static(rootDir));

app.get("/", (_req, res) => {
  res.sendFile(path.join(rootDir, "index (3).html"));
});

app.listen(process.env.PORT || 3000);
