"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Navbar from "@/app/components/Navbar";
import { createClient } from "@/lib/supabase/client";

type Festival = { id: string; name: string; city: string; country: string; start_date: string; end_date: string; genres: string[]; image_url: string | null; description: string | null; votes?: number; attended?: boolean; myVote?: boolean };
type Artist = { id: string; name: string; genres: string[]; image_url: string | null; votes?: number; myVote?: boolean };
type Generation = { id: string; prompt: string; vibe: string; output_text: string; created_by: string; created_at: string; score: number; myVote?: number };
type Tab = "discover" | "passport" | "artists" | "studio";

const demoFestivals: Festival[] = [
  { id: "demo-edc", name: "EDC Las Vegas", city: "Las Vegas, Nevada", country: "USA", start_date: "2026-05-15", end_date: "2026-05-17", genres: ["EDM", "Bass", "Trance"], image_url: null, description: "Three nights under the electric sky." },
  { id: "demo-tomorrowland", name: "Tomorrowland", city: "Boom", country: "Belgium", start_date: "2026-07-17", end_date: "2026-07-26", genres: ["House", "Trance", "Techno"], image_url: null, description: "A world of music, fantasy and connection." },
  { id: "demo-ultra", name: "Ultra Music Festival", city: "Miami, Florida", country: "USA", start_date: "2026-03-27", end_date: "2026-03-29", genres: ["House", "Techno", "EDM"], image_url: null, description: "Downtown Miami meets the global dance scene." },
];
const demoArtists: Artist[] = [
  { id: "demo-summit", name: "John Summit", genres: ["House", "Tech House"], image_url: null },
  { id: "demo-fred", name: "Fred again..", genres: ["Electronic", "UK Garage"], image_url: null },
  { id: "demo-garrix", name: "Martin Garrix", genres: ["Progressive House", "EDM"], image_url: null },
  { id: "demo-amelie", name: "Amelie Lens", genres: ["Techno"], image_url: null },
];
const vibes = ["main-stage energy", "after-hours", "dreamy", "underground", "euphoric"];
const fmtDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function Home() {
  const [supabase] = useState(() => createClient());
  const [tab, setTab] = useState<Tab>("discover");
  const [user, setUser] = useState<any>(null);
  const [festivals, setFestivals] = useState<Festival[]>(demoFestivals);
  const [artists, setArtists] = useState<Artist[]>(demoArtists);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All genres");
  const [festivalName, setFestivalName] = useState("");
  const [festivalCity, setFestivalCity] = useState("");
  const [festivalDate, setFestivalDate] = useState("2026-10-01");
  const [prompt, setPrompt] = useState("A neon-soaked festival night with my favorite people");
  const [vibe, setVibe] = useState(vibes[0]);
  const [generating, setGenerating] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiSearching, setAiSearching] = useState(false);
  const [aiResults, setAiResults] = useState<Omit<Festival, "id" | "image_url">[]>([]);

  useEffect(() => {
    const handleTab = (event: Event) => { const requested = (event as CustomEvent<Tab>).detail; if (["discover", "passport", "artists", "studio"].includes(requested)) setTab(requested); };
    window.addEventListener("raverank-tab", handleTab);
    let alive = true;
    async function load() {
      const [{ data: auth }, { data: festivalRows, error: festivalError }, { data: artistRows }, { data: mediaRows }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("festivals").select("*").gte("start_date", "2026-01-01").order("start_date", { ascending: true }),
        supabase.from("artists").select("*").order("name"),
        supabase.from("ai_generations").select("id,prompt,vibe,output_text,created_by,created_at,score").order("created_at", { ascending: false }).limit(12),
      ]);
      if (!alive) return;
      const currentUser = auth.user ?? null;
      setUser(currentUser);
      if (!festivalError && festivalRows?.length) {
        let mappedFestivals = festivalRows as Festival[];
        let mappedArtists = (artistRows ?? []) as Artist[];
        const [{ data: festivalVoteRows }, { data: artistVoteRows }] = await Promise.all([
          supabase.from("festival_votes").select("festival_id,user_id"),
          supabase.from("artist_votes").select("artist_id,user_id"),
        ]);
        mappedFestivals = mappedFestivals.map((f) => ({ ...f, votes: festivalVoteRows?.filter((v: any) => v.festival_id === f.id).length ?? f.votes ?? 0, myVote: !!currentUser && !!festivalVoteRows?.some((v: any) => v.festival_id === f.id && v.user_id === currentUser.id) }));
        mappedArtists = mappedArtists.map((a) => ({ ...a, votes: artistVoteRows?.filter((v: any) => v.artist_id === a.id).length ?? a.votes ?? 0, myVote: !!currentUser && !!artistVoteRows?.some((v: any) => v.artist_id === a.id && v.user_id === currentUser.id) }));
        if (currentUser) {
          const { data: attendance } = await supabase.from("user_festivals").select("festival_id").eq("user_id", currentUser.id);
          const attendedIds = new Set((attendance ?? []).map((row: any) => row.festival_id));
          mappedFestivals = mappedFestivals.map((f) => ({ ...f, attended: attendedIds.has(f.id) }));
        }
        if (alive) { setFestivals(mappedFestivals); setArtists(mappedArtists); }
      } else if (artistRows?.length) setArtists(artistRows as Artist[]);
      if (mediaRows) {
        let mapped = mediaRows as Generation[];
        if (currentUser && mapped.length) {
          const { data: votes } = await supabase.from("ai_votes").select("generation_id,value").eq("user_id", currentUser.id).in("generation_id", mapped.map((x) => x.id));
          mapped = mapped.map((item) => ({ ...item, myVote: votes?.find((v: any) => v.generation_id === item.id)?.value ?? 0 }));
        }
        if (alive) setGenerations(mapped);
      }
      if (festivalError) setMessage("Showing starter examples until the festivals table is set up in Supabase.");
      setLoading(false);
    }
    void load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => { alive = false; subscription.unsubscribe(); window.removeEventListener("raverank-tab", handleTab); };
  }, [supabase]);

  const filteredFestivals = useMemo(() => festivals.filter((festival) => {
    const matchesQuery = `${festival.name} ${festival.city} ${festival.country} ${(festival.genres ?? []).join(" ")}`.toLowerCase().includes(query.toLowerCase());
    const matchesGenre = genre === "All genres" || (festival.genres ?? []).some((g) => g.toLowerCase() === genre.toLowerCase());
    return matchesQuery && matchesGenre;
  }), [festivals, query, genre]);

  async function requireLogin() {
    if (!user) { window.location.href = "/login?next=/"; return false; }
    return true;
  }

  async function toggleAttendance(festival: Festival) {
    if (!(await requireLogin())) return;
    if (festival.id.startsWith("demo-")) { setMessage("Run the Supabase setup SQL to enable saving festivals to your passport."); return; }
    const isAttending = !!festival.attended;
    const result = isAttending
        ? await supabase.from("user_festivals").delete().eq("user_id", user.id).eq("festival_id", festival.id)
        : await supabase.from("user_festivals").upsert({ user_id: user.id, festival_id: festival.id }, { onConflict: "user_id,festival_id" });
    if (result.error) { setMessage(result.error.message); return; }
    setFestivals((items) => items.map((item) => item.id === festival.id ? { ...item, attended: !isAttending } : item));
    setMessage(isAttending ? "Removed from your festival passport." : "Added to your festival passport ✦");
  }

  async function voteFor(type: "festival" | "artist", item: Festival | Artist) {
    if (!(await requireLogin())) return;
    if (item.id.startsWith("demo-")) { setMessage("Run the Supabase setup SQL to enable persistent community votes."); return; }
    const table = type === "festival" ? "festival_votes" : "artist_votes";
    const wasVoted = !!item.myVote;
    const result = wasVoted
        ? await supabase.from(table).delete().eq("user_id", user.id).eq(type === "festival" ? "festival_id" : "artist_id", item.id)
        : await supabase.from(table).insert(type === "festival" ? { user_id: user.id, festival_id: item.id } : { user_id: user.id, artist_id: item.id });
    if (result.error) { setMessage(result.error.message); return; }
    const update = (items: any[]) => items.map((x) => x.id === item.id ? { ...x, myVote: !wasVoted, votes: Math.max(0, (x.votes ?? 0) + (wasVoted ? -1 : 1)) } : x);
    if (type === "festival") setFestivals(update(festivals)); else setArtists(update(artists));
  }

  async function saveFestival(f: { name: string; city: string; country?: string; start_date: string; end_date?: string | null; genres?: string[]; description?: string | null }) {
    const { data, error } = await supabase
        .from("festivals")
        .insert({
          name: f.name,
          city: f.city,
          country: f.country ?? "",
          start_date: f.start_date,
          end_date: f.end_date ?? null,
          genres: f.genres ?? [],
          description: f.description ?? null,
        })
        .select()
        .single();

    if (error) {
      setMessage(error.code === "23505" ? "That festival is already in the lineup." : error.message);
      return false;
    }
    setFestivals((items) => {
      const withoutDemos = items.filter((x) => !x.id.startsWith("demo-"));
      return [...withoutDemos, { ...(data as Festival), votes: 0, myVote: false, attended: false }]
          .sort((a, b) => a.start_date.localeCompare(b.start_date));
    });
    setMessage(`${data.name} has been added to the lineup ✦`);
    return true;
  }

  async function addFestival(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!(await requireLogin())) return;
    if (!festivalName.trim() || !festivalCity.trim()) { setMessage("Add a festival name and location first."); return; }
    if (await saveFestival({ name: festivalName.trim(), city: festivalCity.trim(), start_date: festivalDate })) {
      setFestivalName(""); setFestivalCity("");
    }
  }

  async function searchFestivalsAI(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!(await requireLogin())) return;
    if (!aiQuery.trim()) { setMessage("Tell the AI what kind of festival to look for."); return; }
    setAiSearching(true); setMessage(""); setAiResults([]);
    try {
      const response = await fetch("/api/suggest-festivals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: aiQuery.trim() }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "Search failed."); return; }
      // hide anything already in the catalog
      const existing = new Set(festivals.map((f) => `${f.name.toLowerCase()}|${f.start_date}`));
      const fresh = (result.suggestions ?? []).filter((s: any) => !existing.has(`${s.name.toLowerCase()}|${s.start_date}`));
      setAiResults(fresh);
      if (!fresh.length) setMessage("No new festivals found for that search. Try different wording.");
    } catch { setMessage("Could not reach the AI service. Try again."); }
    finally { setAiSearching(false); }
  }

  async function addAiResult(s: Omit<Festival, "id" | "image_url">) {
    if (!(await requireLogin())) return;
    if (await saveFestival(s)) setAiResults((items) => items.filter((x) => !(x.name === s.name && x.start_date === s.start_date)));
  }

  async function generateMedia() {
    if (!(await requireLogin())) return;
    if (!prompt.trim()) { setMessage("Add a prompt for your AI festival recap."); return; }
    setGenerating(true); setMessage("");
    try {
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: prompt.trim(), vibe }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "Generation failed."); return; }
      setGenerations((items) => [{ ...result.generation, score: 0, myVote: 0 }, ...items]);
      setMessage("Your AI-generated festival caption is live. Let the crowd decide!");
    } catch { setMessage("Could not reach the AI service. Try again."); }
    finally { setGenerating(false); }
  }

  async function voteForMedia(item: Generation) {
    if (!(await requireLogin())) return;
    const next = item.myVote === 1 ? 0 : 1;
    const result = next === 0
        ? await supabase.from("ai_votes").delete().eq("generation_id", item.id).eq("user_id", user.id)
        : await supabase.from("ai_votes").upsert({ generation_id: item.id, user_id: user.id, value: 1 }, { onConflict: "generation_id,user_id" });
    if (result.error) { setMessage(result.error.message); return; }
    setGenerations((items) => items.map((x) => x.id === item.id ? { ...x, myVote: next, score: (x.score ?? 0) + (next === 1 ? 1 : -1) } : x));
  }

  const totalVotes = festivals.reduce((sum, item) => sum + (item.votes ?? 0), 0) + artists.reduce((sum, item) => sum + (item.votes ?? 0), 0);
  const passportCount = festivals.filter((f) => f.attended).length;

  return <main className="rr-app">
    <Navbar />
    <section className="rr-hero">
      <div className="rr-hero-copy">
        <div className="rr-eyebrow"><span className="rr-pulse" /> THE FESTIVAL COMMUNITY</div>
        <h1>Your next favorite<br /><span>memory starts here.</span></h1>
        <p>Track your festivals. Find your artists. Let the crowd decide.</p>
        <div className="rr-hero-actions"><button className="rr-btn rr-btn-lime" onClick={() => setTab("discover")}>Explore festivals <span>↗</span></button><button className="rr-btn rr-btn-glass" onClick={() => setTab("passport")}>Your festival passport</button></div>
        <div className="rr-stats"><div><strong>{festivals.length}</strong><span>festivals listed</span></div><div><strong>{artists.length}</strong><span>artists to discover</span></div><div><strong>{totalVotes.toLocaleString()}</strong><span>community votes</span></div></div>
      </div>
      <div className="rr-hero-visual"><div className="rr-image-frame"><div className="rr-image-glow"/><div className="rr-hero-image" role="img" aria-label="Neon lights at an electronic music festival"/><div className="rr-image-caption"><span>LIVE THE MOMENT</span><strong>FIND YOUR FREQUENCY.</strong></div><div className="rr-floating-tag">✳ YOUR SCENE. YOUR SOUND.</div></div></div>
    </section>

    <div id="discover" className="rr-main-nav" role="tablist" aria-label="RaveRank sections">
      {([ ["discover", "✦", "Discover"], ["passport", "▣", "My Festivals"], ["artists", "♫", "Artists"], ["studio", "✧", "AI Studio"] ] as [Tab, string, string][]).map(([key, icon, label]) => <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? "rr-tab active" : "rr-tab"} onClick={() => { setTab(key); setMessage(""); }}><span>{icon}</span>{label}</button>)}
    </div>

    {message && <div className="rr-message" role="status"><span>✦</span>{message}<button aria-label="Dismiss message" onClick={() => setMessage("")}>×</button></div>}

    {tab === "discover" && <section className="rr-section">
      <div className="rr-section-heading"><div><div className="rr-kicker">01 / THE CROWD PICKS</div><h2>Festivals worth<br /><em>showing up for.</em></h2></div><p>Real experiences. Community-powered rankings.<br />The festival catalog starts in 2026.</p></div>
      <div className="rr-filters"><label className="rr-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search festivals, cities, genres..." /></label><select value={genre} onChange={(e) => setGenre(e.target.value)} aria-label="Filter by genre">{["All genres", "EDM", "House", "Techno", "Trance", "Bass"].map((g) => <option key={g}>{g}</option>)}</select></div>
      {loading && <p className="rr-muted">Connecting to the festival database…</p>}
      <div className="rr-festival-grid">{filteredFestivals.map((festival, index) => <article className="rr-festival-card" key={festival.id}>
        <div className={`rr-festival-art rr-art-${index % 3}`}><div className="rr-art-orb"/><span className="rr-art-index">FESTIVAL / {String(index + 1).padStart(2, "0")}</span><span className="rr-art-title">{festival.name}</span><span className="rr-art-date">{fmtDate(festival.start_date)}{festival.end_date && festival.end_date !== festival.start_date ? ` — ${fmtDate(festival.end_date)}` : ""}</span></div>
        <div className="rr-card-content"><div className="rr-location">⌖ {festival.city}{festival.country ? ` · ${festival.country}` : ""}</div><h3>{festival.name}</h3><p>{festival.description || "A community favorite in the global electronic music scene."}</p><div className="rr-chips">{(festival.genres ?? []).slice(0, 3).map((g) => <span key={g}>{g}</span>)}</div><div className="rr-card-actions"><button className={festival.myVote ? "rr-vote voted" : "rr-vote"} onClick={() => voteFor("festival", festival)}><span>↑</span> {festival.votes ?? 0} · Upvote</button><button className={festival.attended ? "rr-attended saved" : "rr-attended"} onClick={() => toggleAttendance(festival)}>{festival.attended ? "✓ Been there" : "+ Been there"}</button></div></div>
      </article>)}</div>
      {!filteredFestivals.length && <div className="rr-empty"><span>⌕</span><h3>No festivals found</h3><p>Try a different search or suggest a festival below.</p></div>}
      <div className="rr-suggest rr-ai-search">
        <div>
          <div className="rr-kicker">✧ AI FESTIVAL FINDER</div>
          <h3>Let AI find your next festival.</h3>
          <p>Describe what you're after, like "melodic techno in Europe this summer", and add the results to the lineup.</p>
        </div>
        <div>
          <form onSubmit={searchFestivalsAI} className="rr-ai-form">
            <input value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} maxLength={200} placeholder="e.g. bass music festivals in the US next spring" aria-label="Describe a festival to search for" />
            <button className="rr-btn rr-btn-lime" type="submit" disabled={aiSearching}>{aiSearching ? "Searching…" : "Search ↗"}</button>
          </form>
          {aiResults.length > 0 && <div className="rr-ai-results">
            {aiResults.map((s) => <div className="rr-ai-result" key={`${s.name}-${s.start_date}`}>
              <div>
                <strong>{s.name}</strong>
                <span>⌖ {s.city}{s.country ? ` · ${s.country}` : ""} · {fmtDate(s.start_date)}{s.end_date && s.end_date !== s.start_date ? ` — ${fmtDate(s.end_date)}` : ""}</span>
                {s.description && <p>{s.description}</p>}
              </div>
              <button className="rr-btn" onClick={() => addAiResult(s)}>+ Add</button>
            </div>)}
            <small>AI results can be wrong. Double-check dates on the festival's official site.</small>
          </div>}
        </div>
      </div>
      <div className="rr-suggest"><div><div className="rr-kicker">MISSING FROM THE LINEUP?</div><h3>Add a festival to the scene.</h3><p>Suggest a festival you've attended. We'll add it to the catalog after review.</p></div><form onSubmit={addFestival} className="rr-suggest-form"><input value={festivalName} onChange={(e) => setFestivalName(e.target.value)} placeholder="Festival name" aria-label="Festival name" required/><input value={festivalCity} onChange={(e) => setFestivalCity(e.target.value)} placeholder="City / location" aria-label="City or location" required/><input type="date" min="2026-01-01" value={festivalDate} onChange={(e) => setFestivalDate(e.target.value)} aria-label="Festival date" required/><button className="rr-btn rr-btn-lime" type="submit">Submit festival ↗</button></form></div>
    </section>}

    {tab === "passport" && <section className="rr-section"><div className="rr-section-heading"><div><div className="rr-kicker">02 / YOUR PERSONAL ARCHIVE</div><h2>Your festival<br /><em>passport.</em></h2></div><p>Keep a record of every dance floor, every lineup,<br />and every memory worth keeping.</p></div><div className="rr-passport-banner"><div className="rr-passport-stamp">RR<br/><span>2026+</span></div><div><div className="rr-kicker">YOUR YEAR IN MUSIC</div><h3>{passportCount} {passportCount === 1 ? "festival" : "festivals"} in your story.</h3><p>Tap “Been there” on any festival to add it to your passport.</p></div><button className="rr-btn rr-btn-lime" onClick={() => setTab("discover")}>Find your next one ↗</button></div><div className="rr-passport-list">{festivals.filter((f) => f.attended).map((f) => <div className="rr-passport-row" key={f.id}><span className="rr-check">✓</span><div><strong>{f.name}</strong><p>{f.city} · {fmtDate(f.start_date)}</p></div><button onClick={() => toggleAttendance(f)}>Remove</button></div>)}{!festivals.some((f) => f.attended) && <div className="rr-empty"><span>▣</span><h3>Your story starts on the dance floor.</h3><p>Head to Discover and mark the festivals you've been to.</p><button className="rr-btn rr-btn-lime" onClick={() => setTab("discover")}>Browse festivals ↗</button></div>}</div></section>}

    {tab === "artists" && <section className="rr-section"><div className="rr-section-heading"><div><div className="rr-kicker">03 / WHO OWNS THE DECKS?</div><h2>The artist<br /><em>leaderboard.</em></h2></div><p>Vote for the artists you would cross a festival<br />for. Rankings update with community votes.</p></div><div className="rr-artist-list">{[...artists].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0)).map((artist, index) => <article className="rr-artist-row" key={artist.id}><div className={`rr-artist-avatar rr-avatar-${index % 4}`}><span>{artist.name.split(/\s+/).map((s) => s[0]).join("").slice(0, 2)}</span></div><div className="rr-artist-info"><span className="rr-kicker">RANK #{String(index + 1).padStart(2, "0")}</span><h3>{artist.name}</h3><div className="rr-chips">{(artist.genres ?? []).map((g) => <span key={g}>{g}</span>)}</div></div><div className="rr-artist-votes"><strong>{(artist.votes ?? 0).toLocaleString()}</strong><span>crowd votes</span></div><button className={artist.myVote ? "rr-btn rr-btn-lime" : "rr-btn rr-btn-outline"} onClick={() => voteFor("artist", artist)}>{artist.myVote ? "✓ Voted" : "↑ Vote"}</button></article>)}</div></section>}

    {tab === "studio" && <section className="rr-section"><div className="rr-section-heading"><div><div className="rr-kicker">04 / AI-GENERATED MEDIA</div><h2>Make a memory<br /><em>out of a feeling.</em></h2></div><p>Create an AI-generated festival caption or recap,<br />then let the community vote for their favorites.</p></div><div className="rr-studio-grid"><div className="rr-studio-card"><div className="rr-studio-top"><span>✧ RAVERANK AI STUDIO</span><span className="rr-ai-pill">AI POWERED</span></div><label htmlFor="rr-prompt">What's the feeling?</label><textarea id="rr-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={500} placeholder="Describe your dream festival moment..."/><div className="rr-vibe-label">CHOOSE YOUR ENERGY</div><div className="rr-vibe-options">{vibes.map((v) => <button key={v} className={vibe === v ? "active" : ""} onClick={() => setVibe(v)}>{v}</button>)}</div><button className="rr-btn rr-btn-lime rr-generate" onClick={generateMedia} disabled={generating}>{generating ? "Creating your caption…" : "✧ Generate AI caption"}</button><p className="rr-fine-print">Generated text is saved to the community feed. Votes are tied to your account.</p></div><div className="rr-studio-preview"><div className="rr-preview-art"><span>RAVERANK / AI VISIONS</span><div>MAKE<br/>IT A<br/><em>MEMORY.</em></div><small>YOUR NIGHT. REIMAGINED.</small></div><p>THE COMMUNITY CAN RATE AI-GENERATED MEDIA</p><h3>Make it. Share it. Let the crowd decide.</h3></div></div><div className="rr-section-heading rr-feed-subhead"><div><div className="rr-kicker">COMMUNITY SUBMISSIONS</div><h2>Fresh from the <em>crowd.</em></h2></div></div>{generations.length ? <div className="rr-media-grid">{generations.map((item) => <article className="rr-media-card" key={item.id}><div className="rr-media-label">✧ AI-GENERATED · {item.vibe}</div><p>“{item.output_text}”</p><div className="rr-media-footer"><span>{fmtDate(item.created_at.slice(0, 10))}</span><button className={item.myVote === 1 ? "rr-vote voted" : "rr-vote"} onClick={() => voteForMedia(item)}>↑ {item.score ?? 0} {item.myVote === 1 ? "· Voted" : "· Upvote"}</button></div></article>)}</div> : <div className="rr-empty"><span>✧</span><h3>The next iconic caption could be yours.</h3><p>Generate the first AI creation for the community.</p></div>}</section>}

    <footer className="rr-footer"><Link href="/" className="rr-footer-brand">RAVE<span>RANK</span><b>✳</b></Link><p>YOUR SCENE. YOUR SOUND. YOUR VOTE.</p><div><Link href="/#discover" onClick={() => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("raverank-tab", { detail: "discover" })); }}>Festivals</Link><Link href="/#discover" onClick={() => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("raverank-tab", { detail: "passport" })); }}>My Passport</Link><Link href="/profile">Profile</Link>{user ? <button onClick={async () => { await supabase.auth.signOut(); setUser(null); }}>Log out</button> : <Link href="/login">Log in</Link>}</div></footer>
  </main>;
}
