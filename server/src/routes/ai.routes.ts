import express from "express";
import { Request, Response } from "express";

const router = express.Router();

router.post("/", (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    return res.status(200).json({
      status: "success",
      message: "AI response",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

export default router;
