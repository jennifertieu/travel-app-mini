import aiRoutes from "./routes/ai.routes";
import memberProfileRoutes from "./routes/memberProfiles.routes";
import express from "express";
import { PORT } from "./config";
import { Request, Response } from "express";

const app = express();
app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  try {
  return res.status(200).json({
      status: "success",
      message: "Hello, world!",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});
app.use("/ai", aiRoutes);
app.use("/member-profiles", memberProfileRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on Port: ${PORT}`);
});
