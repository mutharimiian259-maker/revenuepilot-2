require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/authRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const stkRoutes = require("./routes/stkRoutes");

const app = express();

/*
==============================
Security Middleware
==============================
*/

// Secure HTTP headers
app.use(helmet());

// Production-safe CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);

// Logging (disable in production if needed)
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// JSON body parsing
app.use(express.json({ limit: "10kb" }));

/*
==============================
API Routes
==============================
*/

app.use("/api/auth", authRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/stk", stkRoutes);

/*
==============================
Health Check
==============================
*/

app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "RevenuePilot Backend Running",
  });
});

/*
==============================
404 Handler
==============================
*/

app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

/*
==============================
Global Error Handler
==============================
*/

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);

  res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
});

/*
==============================
Start Server
==============================
*/

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`RevenuePilot server active on port ${PORT}`);
});