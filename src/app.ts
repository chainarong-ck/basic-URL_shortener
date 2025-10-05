import express from "express";
import logger from "./utils/logger";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.on("ready", () => {
  logger.info("App is ready");
});

export default app;
