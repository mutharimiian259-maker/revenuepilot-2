require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

/*
=====================================
Routes
=====================================
*/

const authRoutes = require("./routes/authRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

/*
=====================================
Background Jobs / Workers
=====================================
*/

try {
    require("./jobs/subscriptionJob");
    require("./workers/paymentWorker");
} catch (err) {
    console.error("Worker initialization failed:", err.message);
}

/*
=====================================
Express App Initialization
=====================================
*/

const app = express();

/*
=====================================
Security Middleware
=====================================
*/

// Secure HTTP headers
app.use(helmet());

// CORS
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "*",
        credentials: true,
    })
);

// Request logging
if (process.env.NODE_ENV !== "production") {
    app.use(morgan("dev"));
}

// JSON parsing
app.use(express.json({ limit: "10kb" }));

/*
=====================================
Async Route Wrapper
=====================================
*/

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/*
=====================================
API Routes
=====================================
*/

app.use("/api/auth", asyncHandler(authRoutes));
app.use("/api/analytics", asyncHandler(analyticsRoutes));
app.use("/api/payments", asyncHandler(paymentRoutes));

/*
=====================================
Health Endpoint
=====================================
*/

app.get("/", (req, res) => {
    res.status(200).json({
        status: "success",
        message: "RevenuePilot Backend Running",
    });
});

/*
=====================================
404 Handler
=====================================
*/

app.use((req, res) => {
    res.status(404).json({
        status: "error",
        message: "Route not found",
    });
});

/*
=====================================
Global Error Handler
=====================================
*/

app.use((err, req, res, next) => {
    console.error("SERVER ERROR:", err);

    res.status(500).json({
        status: "error",
        message: "Internal server error",
    });
});

/*
=====================================
Crash & Promise Protection
=====================================
*/

process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason) => {
    console.error("UNHANDLED REJECTION:", reason);
});

/*
=====================================
Graceful Shutdown
=====================================
*/

process.on("SIGTERM", () => {
    console.log("RevenuePilot shutting down gracefully");
    process.exit(0);
});

/*
=====================================
Start Server
=====================================
*/

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`RevenuePilot backend running on port ${PORT}`);
});