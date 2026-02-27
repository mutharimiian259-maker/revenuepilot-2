const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");

/*
=====================================
Email/Password Login
=====================================
*/

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Missing credentials" });
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(401).json({ message: error.message });
        }

        return res.status(200).json({
            message: "Login successful",
            session: data.session,
            user: data.user
        });

    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

/*
=====================================
Register
=====================================
*/

router.post("/register", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Missing credentials" });
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) {
            return res.status(400).json({ message: error.message });
        }

        return res.status(201).json({
            message: "Registration successful",
            user: data.user
        });

    } catch (err) {
        console.error("Register error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;