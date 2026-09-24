import { supabase } from "@/lib/supabase";

export default async function Home() {
    const { data: events, error } = await supabase
        .from("edm_events")
        .select("*")
        .order("event_date", { ascending: true });

    if (error) {
        return (
            <main className="container">
                <h1>EDM Events</h1>
                <p className="error">Error loading events: {error.message}</p>
            </main>
        );
    }

    return (
        <main className="container">
            <div className="header">
                <p className="subtitle">LIVE MUSIC & NIGHTLIFE</p>

                <h1>EDM Events</h1>

                <p className="description">
                    Discover upcoming electronic music events and performances.
                </p>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                    <tr>
                        <th>Event</th>
                        <th>Artist</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Venue</th>
                    </tr>
                    </thead>

                    <tbody>
                    {events?.map((event) => (
                        <tr key={event.id}>
                            <td className="event-name">{event.event_name}</td>
                            <td>{event.artist}</td>
                            <td>{event.event_date}</td>
                            <td>{event.event_time}</td>
                            <td>{event.venue}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <p className="event-count">
                {events?.length ?? 0} total events
            </p>

        </main>
    );
}