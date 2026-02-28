// ================================
// Supabase Client Initialization
// ================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ⚠️ Replace with your real values
const SUPABASE_URL = "https://xmqgjunmtwvmatysiyjf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcWdqdW5tdHd2bWF0eXNpeWpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMzY0MjAsImV4cCI6MjA4NjkxMjQyMH0.lyl6brobaXGCYyfP7k3BV3zcAKItwaH69AJr5YLUKLk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ================================
// Register
// ================================
export async function register(email, password) {
    try {

        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) {
            alert(error.message);
            return;
        }

        alert("Registration successful. Check your email if confirmation is required.");

        window.location.href = "/login.html";

    } catch (err) {
        console.error("Register error:", err);
        alert("Unexpected error occurred");
    }
}


// ================================
// Login
// ================================
export async function login(email, password) {
    try {

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            alert(error.message);
            return;
        }

        // ✅ DO NOT STORE TOKENS MANUALLY
        // Supabase automatically handles session securely

        window.location.href = "/dashboard.html";

    } catch (err) {
        console.error("Login error:", err);
        alert("Unexpected error occurred");
    }
}


// ================================
// Google OAuth Login
// ================================
export async function loginWithGoogle() {
    try {

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: window.location.origin + "/dashboard.html"
            }
        });

        if (error) {
            alert(error.message);
        }

    } catch (err) {
        console.error("OAuth error:", err);
        alert("Unexpected OAuth error");
    }
}


// ================================
// Logout
// ================================
export async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login.html";
}


// ================================
// Protect Dashboard Pages
// ================================
export async function protectPage() {

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = "/login.html";
    }
}