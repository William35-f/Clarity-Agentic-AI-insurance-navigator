import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import customerRoutes from "./routes/customerRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import meetingRoutes from "./routes/meetingRoutes.js";
import advisorRoutes from "./routes/advisorRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json()); // MUST be before routes

app.get("/", (req, res) => {
  res.json({ message: "PRU AI Navigator backend is running" });
});

app.use("/api/customers", customerRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/advisor", advisorRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});