"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
    const [supabase] = useState(() => createClient());
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function signInWithGoogle() {
        setLoading(true);
        setError("");
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) { setError(error.message); setLoading(false); }
    }

    return (
        <main className="auth-page">
            <div className="auth-decoration auth-heart">♡</div>
            <div className="auth-decoration auth-star">✦</div>
            <div className="auth-decoration auth-bow">୨୧</div>
            <Link href="/" className="auth-brand">୨୧ EDM<span>.</span></Link>

            <div className="login-shell">
                <div className="login-message">
                    <p className="eyebrow">WELCOME ♡</p>
                    <h1>Your next <span>night</span> starts here.</h1>
                    <p>Save events and keep your lineup in one place.</p>
                </div>
                <div className="login-card">
                    <div className="login-logo-circle">EDM</div>
                    <p className="card-eyebrow">SIGN IN</p>
                    <h2>Welcome back ♡</h2>
                    <button onClick={signInWithGoogle} className="google-button" disabled={loading}>
                        <span className="google-icon">G</span>
                        <span>{loading ? "Opening Google..." : "Continue with Google"}</span>
                        <span>→</span>
                    </button>
                    {error && <p className="auth-error">{error}</p>}
                    <Link href="/" className="back-home">← Home</Link>
                </div>
            </div>
        </main>
    );
}
