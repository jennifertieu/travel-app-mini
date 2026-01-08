import memberProfileRoutes from "./routes/memberProfiles.routes";
import itineraryRoutes from "./routes/itinerary.routes";
import express from "express";
import { PORT } from "./config";

const app = express();
app.use(express.json());

app.use("/member-profiles", memberProfileRoutes);
app.use("/itinerary", itineraryRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on Port: ${PORT}`);
});
