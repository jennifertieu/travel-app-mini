import express, { Request, Response } from "express";
import cors from "cors";
import memberProfileRoutes from "./routes/memberProfiles.routes";
import itineraryRoutes from "./routes/itinerary.routes";
import { PORT } from "./config";
import { supabase } from "./lib/supabase";
import { requireAuth } from "./middleware/requireAuth";
import { IAuthenticatedRequest } from "./types/interface";
import * as enrichmentController from "./controllers/enrichment.controller";

const app = express();

app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

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

// Enrichment endpoint (no auth required for hackathon mode)
app.post("/api/enrich", enrichmentController.enrich);

app.get(
  "/exampleProtectedRoute",
  requireAuth,
  async (request: Request, response: Response) => {
    const { user } = request as IAuthenticatedRequest;

    const {
      data: { updatedUser },
      error,
    } = await supabase
      .from("example_table")
      .update({ some_column: "new_value" })
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return response.status(500).json({ error: error.message });
    }

    return response.json({ updatedUser });
  }
);

app.use("/member-profiles", memberProfileRoutes);
app.use("/itinerary", itineraryRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on Port: ${PORT}`);
});
