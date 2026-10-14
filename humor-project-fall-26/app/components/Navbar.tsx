"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
    const [supabase] = useState(() => createClient());
    const [loggedIn, setLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setLoggedIn(!!user);
            setLoading(false);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setLoggedIn(!!session);
            setLoading(false);
        });
        return () => subscription.unsubscribe();
    }, [supabase]);

    return (
        <nav className="navbar">
            <Link href="/" className="brand">
                <span className="brand-mark">✦</span>EDM<span className="brand-dot">.</span>
            </Link>
            <div className="nav-links">
                <Link href="/#create">Create</Link>
                <Link href="/#feed">Community</Link>
                <Link href="/events">Events</Link>
                {loggedIn && <Link href="/my-events">My Nights</Link>}
                {!loading && (loggedIn
                        ? <Link href="/profile" className="nav-profile">Profile</Link>
                        : <Link href="/login" className="nav-login">Log in →</Link>
                )}
            </div>
        </nav>
    );
}
