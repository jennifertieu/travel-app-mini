import express, { Request, Response } from "express";
import { PORT } from "./config";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "./middleware/requireAuth";
import { IAuthenticatedRequest } from "./types/interface";

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

app.listen(PORT, () => {
  console.log(`Server is running on Port: ${PORT}`);
});
