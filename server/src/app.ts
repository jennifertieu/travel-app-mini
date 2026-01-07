import aiRoutes from "./routes/ai.routes";
import memberProfileRoutes from "./routes/memberProfiles.routes";
import express from "express";
import { PORT } from "./config";

const app = express();
app.use(express.json());

app.use("/ai", aiRoutes);
app.use("/member-profiles", memberProfileRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on Port: ${PORT}`);
});
