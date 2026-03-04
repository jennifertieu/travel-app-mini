import memberProfileRoutes from "./routes/memberProfiles.routes.js";
import enrichmentRoutes from "./routes/enrichment.routes.js";
import itineraryRoutes from "./routes/itinerary.routes.js";
import photoGuideRoutes from "./routes/photoGuide.routes.js";
import duringTripRoutes from "./routes/duringTrip.routes.js";
import suggestionsRoutes from "./routes/suggestions.routes.js";
import areaSearchRoutes from "./routes/areaSearch.routes.js";
import placesRoutes from "./routes/places.routes.js";
import demoRoutes from "./routes/demo.routes.js";
import travelGuideRoutes from "./routes/travelGuide.routes.js";
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
app.use("/photo-guide", photoGuideRoutes);
app.use("/enrich", enrichmentRoutes);
app.use("/during-trip", duringTripRoutes);
app.use("/suggestions", suggestionsRoutes);
app.use("/suggestions/area-search", areaSearchRoutes);
app.use("/places", placesRoutes);
app.use("/demo", demoRoutes);
app.use("/travel-guide", travelGuideRoutes);

// Health check endpoint (used by keep-alive ping)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app
  .listen(PORT, () => {
    console.log(`Server is running on Port: ${PORT}`);

    // Keep-alive self-ping: prevents Render free tier from sleeping
    // Pings own health endpoint every 5 minutes
    if (process.env.NODE_ENV === "production") {
      const RENDER_URL =
        process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
      setInterval(
        async () => {
          try {
            await fetch(`${RENDER_URL}/health`);
            console.log("🏓 Keep-alive ping sent");
          } catch {
            // fail silently — next ping will retry
          }
        },
        5 * 60 * 1000,
      ); // every 5 minutes
    }
  })
  .setTimeout(0); // Disable timeout for long-running requests (itinerary build can take 3-5 min)
