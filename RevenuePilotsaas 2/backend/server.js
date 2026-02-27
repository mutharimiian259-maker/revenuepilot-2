require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();
const server = http.createServer(app);

/*
=====================================
Realtime Engine Initialization
=====================================
*/

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"]
    }
});

/*
=====================================
Middleware
=====================================
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
=====================================
Routes
=====================================
*/

app.use("/api/auth", authRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/payments", paymentRoutes);

/*
=====================================
Realtime Transaction Broadcast
=====================================
*/

io.on("connection", (socket) => {

    console.log("Client connected to realtime stream");

    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });
});

/*
=====================================
Global Event Publisher
=====================================
*/

async function broadcastEvent(event, payload) {
    io.emit(event, payload);
}

/*
=====================================
Payment Success Hook
=====================================
*/

const supabase = require("./config/supabase");

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

            if (payload.new.status === "SUCCESS") {

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
=====================================
Start Server
=====================================
*/

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`RevenuePilot realtime backend running on port ${PORT}`);
});