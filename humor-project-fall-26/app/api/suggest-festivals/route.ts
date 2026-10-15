import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";

const SYSTEM_PROMPT = `You are the festival scout for RaveRank, an electronic music community.
Use Google Search to find real, upcoming electronic/dance music festivals matching the user's request.
Only include festivals that actually exist and have a confirmed or announced date on or after today.
Respond with ONLY a JSON array (no markdown, no commentary) of up to 5 objects with this exact shape:
{"name": string, "city": string, "country": string, "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD" | null, "genres": string[] (max 3), "description": string (one sentence)}
If you cannot verify a date, omit that festival. If nothing matches, respond with [].`;

type Suggestion = {
    name: string; city: string; country: string;
    start_date: string; end_date: string | null;
    genres: string[]; description: string;
};

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Log in to search for festivals." }, { status: 401 });

        const body = await request.json();
        const query = String(body.query ?? "").trim();
        if (!query || query.length > 200) {
            return NextResponse.json({ error: "Describe the festival you're looking for (200 characters max)." }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return NextResponse.json({ error: "AI is not configured yet. Add GEMINI_API_KEY." }, { status: 500 });

        const today = new Date().toISOString().slice(0, 10);

        async function callGemini(useSearch: boolean) {
            return fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                        contents: [{ role: "user", parts: [{ text: `Today is ${today}. Find festivals for: ${query}` }] }],
                        ...(useSearch ? { tools: [{ google_search: {} }] } : {}),
                        generationConfig: {
                            temperature: 0.2,
                            maxOutputTokens: 4000,
                            thinkingConfig: { thinkingLevel: "low" },
                        },
                    }),
                }
            );
        }

        let geminiResponse = await callGemini(true);
        if (!geminiResponse.ok) {
            console.error("Gemini festival search error (with grounding):", await geminiResponse.text());
            geminiResponse = await callGemini(false); // fall back to no web search
        }
        if (!geminiResponse.ok) {
            console.error("Gemini festival search error (no grounding):", await geminiResponse.text());
            return NextResponse.json({ error: "The AI search had a moment. Try again." }, { status: 502 });
        }

        const result = await geminiResponse.json();
        const text: string = result?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";

        // Grounded responses can't force JSON mode, so pull the array out of the text
        const match = text.match(/\[[\s\S]*\]/);
        if (!match) return NextResponse.json({ suggestions: [] });

        let parsed: any[];
        try { parsed = JSON.parse(match[0]); } catch { return NextResponse.json({ suggestions: [] }); }

        const suggestions: Suggestion[] = parsed
            .filter((s) => s && typeof s.name === "string" && typeof s.city === "string" && isDate(s.start_date) && s.start_date >= today)
            .slice(0, 5)
            .map((s) => ({
                name: s.name.trim().slice(0, 120),
                city: s.city.trim().slice(0, 120),
                country: typeof s.country === "string" ? s.country.trim().slice(0, 80) : "",
                start_date: s.start_date,
                end_date: isDate(s.end_date) && s.end_date >= s.start_date ? s.end_date : null,
                genres: Array.isArray(s.genres) ? s.genres.filter((g: unknown) => typeof g === "string").slice(0, 3) : [],
                description: typeof s.description === "string" ? s.description.trim().slice(0, 240) : "",
            }));

        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
}