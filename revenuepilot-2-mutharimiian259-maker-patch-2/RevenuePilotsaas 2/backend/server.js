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
APP INITIALIZATION
============================================
*/

const app = express();
const server = http.createServer(app);

/*
============================================
REALTIME SOCKET ENGINE
============================================
*/

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"]
    }
});

/*
============================================
WORKER BOOTSTRAP
============================================
*/

try {
    require("./workers/selfHealingWorker");
    require("./workers/paymentWorker");
    require("./workers/workerHeartbeat");
    require("./workers/watchdogWorker");
    require("./workers/reconciliationWorker");
    require("./workers/shadowObserverWorker");
    require("./workers/ledgerValidatorWorker");
    require("./workers/callbackBufferWorker");
    require("./workers/auditOracleWorker");
} catch (err) {
    console.error("Worker bootstrap failed:", err.message);
}

/*
============================================
MIDDLEWARE STACK
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
ROUTES
============================================
*/

app.use("/api/auth", authRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/payments", paymentRoutes);

/*
============================================
HEALTH CHECK
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
REALTIME BROADCAST ENGINE
============================================
*/

io.on("connection", (socket) => {
    console.log("Client connected");

    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });
});

/*
============================================
SUPABASE STREAM LISTENER
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
                io.emit("payment_success", {
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
GLOBAL ERROR HANDLER
============================================
*/

app.use((err, req, res, next) => {
    console.error("SERVER ERROR:", err.message);

    res.status(err.status || 500).json({
        status: "error",
        message: "Internal server error"
    });
});

/*
============================================
SERVER START
============================================
*/

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`RevenuePilot backend running on port ${PORT}`);
});