"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import { createClient } from "@/lib/supabase/client";

type Event = { id: number; event_name: string; artist: string; event_date: string; event_time: string; venue: string };

export default function MyEventsPage() {
    const [supabase] = useState(() => createClient());
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    useEffect(() => { loadSavedEvents(); }, []);

    async function loadSavedEvents() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = "/login"; return; }
        const { data, error } = await supabase.from("saved_events").select("event_id, edm_events(id,event_name,artist,event_date,event_time,venue)").eq("user_id", user.id);
        if (error) { setMessage(error.message); setLoading(false); return; }
        setEvents((data ?? []).map((item: any) => item.edm_events).filter(Boolean));
        setLoading(false);
    }

    async function removeEvent(eventId: number) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = "/login"; return; }
        const { error } = await supabase.from("saved_events").delete().eq("user_id", user.id).eq("event_id", eventId);
        if (error) { setMessage(error.message); return; }
        setEvents((current) => current.filter((event) => event.id !== eventId));
        setMessage("Removed from your favorites ♡");
        setTimeout(() => setMessage(""), 2200);
    }

    if (loading) return <main className="site-page"><Navbar /><div className="page-loading"><div className="loading-heart">♡</div><p>Loading your favorites...</p></div></main>;

    return (
        <main className="site-page">
            <Navbar />
            <section className="my-events-page">
                <div className="my-events-heading">
                    <div><p className="eyebrow">YOUR FAVORITES</p><h1>My <span>Events.</span></h1></div>
                    <div className="saved-count"><span>SAVED</span><strong>{events.length}</strong></div>
                </div>

                {message && <div className="toast-message">♡ {message}</div>}

                {events.length === 0 ? (
                    <div className="empty-card saved-empty">
                        <div className="empty-icon">♡</div>
                        <p className="eyebrow">YOUR LINEUP IS EMPTY</p>
                        <h2>Let's find you a night.</h2>
                        <p>Save events from the Events page and they'll appear here.</p>
                        <Link href="/events" className="primary-button">Browse Events ♡</Link>
                    </div>
                ) : (
                    <div className="saved-events-grid">
                        {events.map((event) => (
                            <article className="saved-event-card" key={event.id}>
                                <div className="saved-card-top"><span className="saved-pill">♡ SAVED</span><button onClick={() => removeEvent(event.id)} className="remove-icon" aria-label="Remove event">×</button></div>
                                <div className="saved-date">{event.event_date}</div>
                                <h2>{event.event_name}</h2>
                                <p className="saved-artist">{event.artist}</p>
                                <div className="saved-details"><div><span>TIME</span><strong>{event.event_time}</strong></div><div><span>VENUE</span><strong>{event.venue}</strong></div></div>
                            </article>
                        ))}
                    </div>
                )}

                <div className="keep-exploring"><span>♡</span><strong>Need more plans?</strong><Link href="/events">Explore →</Link></div>
            </section>
        </main>
    );
}
