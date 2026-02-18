import memberProfileRoutes from "./routes/memberProfiles.routes.js";
import enrichmentRoutes from "./routes/enrichment.routes.js";
import itineraryRoutes from "./routes/itinerary.routes.js";
import duringTripRoutes from "./routes/duringTrip.routes.js";
import suggestionsRoutes from "./routes/suggestions.routes.js";
import areaSearchRoutes from "./routes/areaSearch.routes.js";
import express from "express";
import { PORT } from "./config.js";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  }),
);

app.use(express.json());

app.use("/member-profiles", memberProfileRoutes);
app.use("/itinerary", itineraryRoutes);
app.use("/enrich", enrichmentRoutes);
app.use("/during-trip", duringTripRoutes);
app.use("/suggestions", suggestionsRoutes);
app.use("/suggestions/area-search", areaSearchRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on Port: ${PORT}`);
});
