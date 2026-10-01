"use client";

import { useEffect, useState } from "react";
import Navbar from "@/app/components/Navbar";
import { createClient } from "@/lib/supabase/client";

type Event = {
    id: number;
    event_name: string;
    artist: string;
    event_date: string;
    event_time: string;
    venue: string;
};

export default function EventsPage() {
    const [supabase] = useState(() => createClient());

    const [events, setEvents] = useState<Event[]>([]);
    const [savedEvents, setSavedEvents] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    useEffect(() => {
        loadEvents();
    }, []);

    async function loadEvents() {
        setLoading(true);
        setMessage("");

        // Get the current user first.
        const {
            data: { user },
        } = await supabase.auth.getUser();

        // Events should ALWAYS be loaded,
        // whether the user is logged in or not.
        const {
            data: eventsData,
            error: eventsError,
        } = await supabase
            .from("edm_events")
            .select("*")
            .order("event_date", { ascending: true });

        if (eventsError) {
            console.error("Events error:", eventsError);
            setMessage(eventsError.message);
            setLoading(false);
            return;
        }

        setEvents(eventsData ?? []);

        // Only load saved events if the user is logged in.
        if (user) {
            const {
                data: savedData,
                error: savedError,
            } = await supabase
                .from("saved_events")
                .select("event_id")
                .eq("user_id", user.id);

            if (savedError) {
                console.error("Saved events error:", savedError);
            } else {
                setSavedEvents(
                    (savedData ?? []).map((item: any) => item.event_id)
                );
            }
        } else {
            setSavedEvents([]);
        }

        setLoading(false);
    }

    async function toggleSave(eventId: number) {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        // User must be logged in to save an event.
        if (!user) {
            window.location.href = "/login";
            return;
        }

        const isSaved = savedEvents.includes(eventId);

        if (isSaved) {
            const { error } = await supabase
                .from("saved_events")
                .delete()
                .eq("user_id", user.id)
                .eq("event_id", eventId);

            if (error) {
                console.error("Remove event error:", error);
                setMessage(error.message);
                return;
            }

            setSavedEvents((current) =>
                current.filter((id) => id !== eventId)
            );

            setMessage("Removed from My Events ♡");
        } else {
            const { error } = await supabase
                .from("saved_events")
                .insert({
                    user_id: user.id,
                    event_id: eventId,
                });

            if (error) {
                console.error("Save event error:", error);
                setMessage(error.message);
                return;
            }

            setSavedEvents((current) => [
                ...current,
                eventId,
            ]);

            setMessage("Saved to My Events ♡");
        }

        setTimeout(() => {
            setMessage("");
        }, 2200);
    }

    function formatDate(date: string) {
        if (!date) return "";

        const parsedDate = new Date(`${date}T00:00:00`);

        if (Number.isNaN(parsedDate.getTime())) {
            return date;
        }

        return parsedDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }

    if (loading) {
        return (
            <main className="site-page">
                <Navbar />

                <div className="page-loading">
                    <div className="loading-heart">♡</div>
                    <p>Finding your next night...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="site-page">
            <Navbar />

            <section className="events-page">
                {/* Header */}
                <div className="events-hero">
                    <div>
                        <p className="eyebrow">
                            NYC NIGHTLIFE
                        </p>

                        <h1>
                            Upcoming{" "}
                            <span>Events.</span>
                        </h1>

                        <p className="events-subtitle">
                            Find your next night out ♡
                        </p>
                    </div>

                    <div className="event-count-card">
                        <span>EVENTS</span>
                        <strong>{events.length}</strong>
                    </div>
                </div>

                {/* Message */}
                {message && (
                    <div className="toast-message">
                        ♡ {message}
                    </div>
                )}

                {/* No events */}
                {events.length === 0 ? (
                    <div className="empty-card">
                        <div className="empty-icon">♫</div>

                        <h2>No events yet</h2>

                        <p>
                            Check back soon for more NYC EDM events.
                        </p>git reflog expire --expire=now --all
                    </div>
                ) : (
                    /* Events */
                    <div className="event-grid">
                        {events.map((event, index) => {
                            const isSaved = savedEvents.includes(
                                event.id
                            );

                            return (
                                <article
                                    className="event-card"
                                    key={event.id}
                                >
                                    {/* Top */}
                                    <div className="event-card-top">
                                        <span className="event-number">
                                            {String(index + 1).padStart(
                                                2,
                                                "0"
                                            )}
                                        </span>

                                        <span
                                            className={
                                                isSaved
                                                    ? "heart saved"
                                                    : "heart"
                                            }
                                        >
                                            {isSaved ? "♥" : "♡"}
                                        </span>
                                    </div>

                                    {/* Date */}
                                    <div className="event-date-pill">
                                        {formatDate(
                                            event.event_date
                                        )}
                                    </div>

                                    {/* Event name */}
                                    <h2>
                                        {event.event_name}
                                    </h2>

                                    {/* Artist */}
                                    <p className="event-artist">
                                        {event.artist}
                                    </p>

                                    {/* Details */}
                                    <div className="event-info">
                                        <div>
                                            <span>TIME</span>
                                            <strong>
                                                {event.event_time}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>VENUE</span>
                                            <strong>
                                                {event.venue}
                                            </strong>
                                        </div>
                                    </div>

                                    {/* Save */}
                                    <button
                                        type="button"
                                        className={
                                            isSaved
                                                ? "save-button saved"
                                                : "save-button"
                                        }
                                        onClick={() =>
                                            toggleSave(event.id)
                                        }
                                    >
                                        {isSaved
                                            ? "Saved ♥"
                                            : "Save Event ♡"}
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </main>
    );
}