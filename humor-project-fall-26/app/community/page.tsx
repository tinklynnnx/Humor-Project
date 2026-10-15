"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/app/components/Navbar";
import { createClient } from "@/lib/supabase/client";

type Generation = {
    id: string;
    prompt: string;
    vibe: string;
    output_text: string;
    created_by: string;
    created_at: string;
    score?: number;
    myVote?: number;
};

const vibes = ["late-night", "main-character", "chaotic", "romantic", "underground"];

export default function Home() {
    const [supabase] = useState(() => createClient());
    const [user, setUser] = useState<any>(null);
    const [generations, setGenerations] = useState<Generation[]>([]);
    const [prompt, setPrompt] = useState("");
    const [vibe, setVibe] = useState(vibes[0]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    useEffect(() => {
        loadFeed();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            loadFeed();
        });
        return () => subscription.unsubscribe();
    }, [supabase]);

    async function loadFeed() {
        setLoading(true);
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser ?? null);

        const { data, error: feedError } = await supabase
            .from("ai_generations")
            .select("id, prompt, vibe, output_text, created_by, created_at, score")
            .order("created_at", { ascending: false })
            .limit(30);

        if (feedError) {
            setError(feedError.message);
            setLoading(false);
            return;
        }

        let myVotes: any[] = [];
        if (currentUser) {
            const rows = (data ?? []) as Generation[];

            let myVotes: { generation_id: string; value: number }[] = [];

            if (currentUser) {
                const ids = rows.map((item) => item.id);

                if (ids.length) {
                    const {data: voteData} = await supabase
                        .from("ai_votes")
                        .select("generation_id, value")
                        .in("generation_id", ids);

                    myVotes = (voteData ?? []) as {
                        generation_id: string;
                        value: number;
                    }[];
                }
            }

            const mapped: Generation[] = rows.map((item) => ({
                ...item,
                myVote:
                    myVotes.find((vote) => vote.generation_id === item.id)?.value ?? 0,
            }));

            setGenerations(mapped);
            setLoading(false);
        }
    }

    async function generate() {
        if (!user) {
            window.location.href = "/login?next=/";
            return;
        }
        if (!prompt.trim()) {
            setError("Give the AI a little idea first.");
            return;
        }

        setGenerating(true);
        setError("");
        setNotice("");

        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: prompt.trim(), vibe }),
            });
            const result = await response.json();
            if (!response.ok) {
                setError(result.error ?? "Generation failed.");
                return;
            }
            setGenerations((current) => [{ ...result.generation, score: 0, myVote: 0 }, ...current]);
            setPrompt("");
            setNotice("Your caption is live. Let the crowd decide. ♡");
        } catch {
            setError("Could not reach the AI. Try again.");
        } finally {
            setGenerating(false);
        }
    }

    async function vote(generationId: string, value: number) {
        if (!user) {
            window.location.href = "/login?next=/";
            return;
        }

        const existing = generations.find((item) => item.id === generationId)?.myVote ?? 0;
        const nextValue = existing === value ? 0 : value;

        if (nextValue === 0) {
            const { error: deleteError } = await supabase
                .from("ai_votes")
                .delete()
                .eq("generation_id", generationId)
                .eq("user_id", user.id);
            if (deleteError) {
                setError(deleteError.message);
                return;
            }
        } else {
            const { error: voteError } = await supabase
                .from("ai_votes")
                .upsert(
                    { generation_id: generationId, user_id: user.id, value: nextValue },
                    { onConflict: "generation_id,user_id" }
                );
            if (voteError) {
                setError(voteError.message);
                return;
            }
        }

        setGenerations((current) => current.map((item) => {
            if (item.id !== generationId) return item;
            const oldVote = item.myVote ?? 0;
            return { ...item, myVote: nextValue, score: (item.score ?? 0) - oldVote + nextValue };
        }));
    }

    const top = useMemo(
        () => [...generations].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 3),
        [generations]
    );

    return (
        <main className="site-page">
            <Navbar />
            <section className="hero">
                <div className="hero-content">
                    <p className="eyebrow">NYC • EDM • AI • COMMUNITY</p>
                    <h1>Make the night <span>yours.</span></h1>
                    <p className="hero-description">
                        EDM. is your crowd-sourced playground for NYC nightlife. Create an AI caption,
                        see what everyone else made, and vote for the ones that deserve the aux.
                    </p>
                    <div className="hero-buttons">
                        <a href="#create" className="primary-button">Create with AI ✦</a>
                        <Link href="/events" className="secondary-button">Explore events ♡</Link>
                    </div>
                    <div className="hero-stat-row">
                        <div><strong>{generations.length}</strong><span>community creations</span></div>
                        <div><strong>{top.length ? "LIVE" : "NEW"}</strong><span>crowd-ranked feed</span></div>
                        <div><strong>NYC</strong><span>built for the city</span></div>
                    </div>
                </div>
                <div className="hero-art" aria-hidden="true">
                    <div className="hero-orbit orbit-one" />
                    <div className="hero-orbit orbit-two" />
                    <div className="hero-ticket">
                        <span>EDM. / AI NIGHTLIFE</span>
                        <strong>YOU<br />+ AI<br /><em>TONIGHT.</em></strong>
                        <small>MAKE SOMETHING WORTH SHARING</small>
                    </div>
                    <span className="hero-sticker sticker-one">✦</span>
                    <span className="hero-sticker sticker-two">♡</span>
                </div>
            </section>

            <section className="create-section" id="create">
                <div className="section-kicker">
                    <p className="eyebrow">01 / CREATE</p>
                    <h2>Give the AI a <em>vibe.</em></h2>
                    <p>Turn a tiny idea into a caption your group chat would actually send.</p>
                </div>

                <div className="generator-card">
                    <div className="generator-top">
                        <span className="generator-label">AI CAPTION STUDIO</span>
                        <span className="generator-status"><i /> Gemini powered</span>
                    </div>
                    <label htmlFor="prompt">What are we making tonight?</label>
                    <textarea
                        id="prompt"
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        placeholder="e.g. Basement rave in Brooklyn after a brutal week of midterms..."
                        maxLength={500}
                    />
                    <div className="generator-controls">
                        <div className="vibe-picker">
                            <span>VIBE</span>
                            {vibes.map((option) => (
                                <button
                                    key={option}
                                    className={vibe === option ? "vibe active" : "vibe"}
                                    onClick={() => setVibe(option)}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                        <button className="generate-button" onClick={generate} disabled={generating}>
                            {generating ? "Creating..." : user ? "Generate caption ✦" : "Log in to create →"}
                        </button>
                    </div>
                    {error && <div className="inline-error">{error}</div>}
                    {notice && <div className="inline-notice">♡ {notice}</div>}
                </div>
            </section>

            <section className="feed-section" id="feed">
                <div className="feed-heading">
                    <div>
                        <p className="eyebrow">02 / THE CROWD DECIDES</p>
                        <h2>What is the internet <em>feeling?</em></h2>
                    </div>
                    <span className="feed-note">Upvote the ones you'd actually post.</span>
                </div>

                {loading ? (
                    <div className="feed-loading"><span>✦</span><p>Loading the crowd...</p></div>
                ) : generations.length === 0 ? (
                    <div className="empty-feed">
                        <span>✦</span>
                        <h3>Be the first one in.</h3>
                        <p>Create the first AI caption and start the feed.</p>
                        <a href="#create" className="primary-button">Make one ✦</a>
                    </div>
                ) : (
                    <div className="generation-grid">
                        {generations.map((generation, index) => (
                            <article className={`generation-card ${index === 0 ? "featured" : ""}`} key={generation.id}>
                                <div className="generation-meta">
                                    <span>#{String(index + 1).padStart(2, "0")}</span>
                                    <span>{generation.vibe.replace("-", " ")}</span>
                                </div>
                                <div className="generation-copy">“{generation.output_text}”</div>
                                <div className="generation-prompt">Prompt · {generation.prompt}</div>
                                <div className="generation-footer">
                                    <div className="vote-group">
                                        <button
                                            className={generation.myVote === 1 ? "vote active" : "vote"}
                                            onClick={() => vote(generation.id, 1)}
                                            aria-label="Upvote"
                                        >↑</button>
                                        <strong>{generation.score ?? 0}</strong>
                                        <button
                                            className={generation.myVote === -1 ? "vote active down" : "vote"}
                                            onClick={() => vote(generation.id, -1)}
                                            aria-label="Downvote"
                                        >↓</button>
                                    </div>
                                    <span className="generation-time">{new Date(generation.created_at).toLocaleDateString()}</span>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className="product-section">
                <div className="product-card">
                    <div>
                        <p className="eyebrow">03 / KEEP GOING</p>
                        <h2>Made something good? Find the real night.</h2>
                        <p>Use the event board to turn a generated vibe into an actual NYC plan. Save the nights you want to remember.</p>
                    </div>
                    <div className="product-actions">
                        <Link href="/events" className="primary-button">Browse events →</Link>
                        <Link href="/my-events" className="secondary-button">My saved nights</Link>
                    </div>
                </div>
            </section>

            <footer className="footer">
                <div><strong>EDM<span>.</span></strong><p>AI ideas for real NYC nights ♡</p></div>
                <div className="footer-links"><Link href="/events">Events</Link><Link href="/my-events">My Events</Link><Link href="/profile">Profile</Link></div>
            </footer>
        </main>
    );
}
