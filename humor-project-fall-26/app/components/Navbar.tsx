"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
    const [supabase] = useState(() => createClient());
    const [loggedIn, setLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => { setLoggedIn(!!user); setLoading(false); });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setLoggedIn(!!session); setLoading(false); });
        return () => subscription.unsubscribe();
    }, [supabase]);
    return <nav className="navbar rr-navbar">
        <Link href="/" className="brand rr-brand"><span className="rr-brand-mark">✳</span><span>RAVE<span>RANK</span></span></Link>
        <div className="nav-links rr-nav-links"><Link href="/#discover" onClick={() => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("raverank-tab", { detail: "discover" })); }}>Discover</Link><Link href="/#discover" onClick={() => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("raverank-tab", { detail: "artists" })); }}>Artists</Link><Link href="/#discover" onClick={() => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("raverank-tab", { detail: "discover" })); }}>Festivals</Link>{loggedIn && <Link href="/#discover" onClick={() => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("raverank-tab", { detail: "passport" })); }}>My Passport</Link>}{!loading && (loggedIn ? <Link href="/profile" className="nav-profile">Profile ↗</Link> : <Link href="/login" className="nav-login">Log in ↗</Link>)}</div>
    </nav>;
}
