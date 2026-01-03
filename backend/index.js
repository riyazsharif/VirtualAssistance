import express from "express";
import dotenv from "dotenv";
dotenv.config();
import connectDb from "./config/db.js";
import authRouter from "./routes/auth.routes.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.routes.js";
import geminiResponse from "./gemini.js";

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
const port = process.env.PORT || 8000;
app.use(express.json());
app.use(cookieParser());

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ message: "Backend server is running!", status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  console.error("Error stack:", err.stack);
  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
  console.error("Error stack:", err.stack);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  console.error("Error stack:", err.stack);
  // Don't exit immediately, let the error handler handle it
});

app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
  console.log(`📡 Health check: http://localhost:${port}/`);
  connectDb();
});
