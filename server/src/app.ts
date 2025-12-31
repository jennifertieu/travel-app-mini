import express, { Request, Response } from "express";
import { PORT } from "./config";

const app = express();

app.use(express.json());

app.get("/health", (request: Request, response: Response) => {
  response.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server is running on Port: ${PORT}`);
});
