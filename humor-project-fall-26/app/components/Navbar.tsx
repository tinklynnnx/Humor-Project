"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
    const [supabase] = useState(() => createClient());
    const [loggedIn, setLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkUser() {
            const { data: { session } } = await supabase.auth.getSession();
            setLoggedIn(!!session);
            setLoading(false);
        }

        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) =>  {
            setLoggedIn(!!session);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    return (
        <nav className="navbar">
            <Link href="/" className="brand">
                <span className="brand-bow">୨୧</span>
                EDM<span className="brand-dot">.</span>
            </Link>

            <div className="nav-links">
                <Link href="/">Home</Link>
                <Link href="/events">Events</Link>
                {loggedIn && <Link href="/my-events">My Events</Link>}
                {loggedIn && <Link href="/profile">Profile</Link>}
                {!loading && !loggedIn && (
                    <Link href="/login" className="nav-login">Log in</Link>
                )}
            </div>
        </nav>
    );
}
