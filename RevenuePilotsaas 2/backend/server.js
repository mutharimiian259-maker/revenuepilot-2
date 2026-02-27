const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const supabase = require("./config/supabase");

/*
============================================
App Initialization
============================================
*/

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"]
    }
});

/*
============================================
Worker Bootstrap Layer
============================================
*/

try {
    require("./workers/selfHealingWorker");
    require("./workers/paymentWorker");
    require("./workers/workerHeartbeat");
    require("./workers/watchdogWorker");
} catch (err) {
    console.error("Worker bootstrap failed:", err.message);
}

/*
============================================
Security Middleware
============================================
*/

app.use(helmet());

app.use(
    cors({
        origin: process.env.FRONTEND_URL || "*",
        credentials: true
    })
);

if (process.env.NODE_ENV !== "production") {
    app.use(morgan("dev"));
}

app.use(express.json({ limit: "10kb" }));

/*
============================================
Async Wrapper
============================================
*/

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/*
============================================
Routes
============================================
*/

app.use("/api/auth", asyncHandler(authRoutes));
app.use("/api/analytics", asyncHandler(analyticsRoutes));
app.use("/api/payments", asyncHandler(paymentRoutes));

/*
============================================
Health Endpoint
============================================
*/

app.get("/", (req, res) => {
    res.status(200).json({
        status: "success",
        message: "RevenuePilot Backend Running"
    });
});

/*
============================================
Realtime Engine
============================================
*/

io.on("connection", (socket) => {
    console.log("Client connected to realtime stream");

    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });
});

function broadcastEvent(event, payload) {
    io.emit(event, payload);
}

/*
============================================
Supabase Payment Stream Listener
============================================
*/

supabase
    .channel("revenue_stream")
    .on(
        "postgres_changes",
        {
            event: "UPDATE",
            schema: "public",
            table: "stk_transactions"
        },
        (payload) => {

            if (payload.new?.status === "SUCCESS") {

                broadcastEvent("payment_success", {
                    transactionId: payload.new.id,
                    amount: payload.new.amount,
                    businessId: payload.new.business_id
                });
            }

        }
    )
    .subscribe();

/*
============================================
Global Error Handler
============================================
*/

app.use((err, req, res, next) => {

    console.error("SERVER ERROR:", err.message);

    res.status(500).json({
        status: "error",
        message: "Internal server error"
    });
});

/*
============================================
Server Start
============================================
*/

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`RevenuePilot realtime backend running on port ${PORT}`);
});