import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_PROMPT = `You are the creative voice of EDM., a playful NYC nightlife community for college students.
Generate one short, original social caption for a fictional or real-feeling NYC EDM night.
The caption should feel current, witty, specific to NYC nightlife, and natural—not corporate or overly polished.
Keep it to 1–3 sentences. Do not use hashtags unless they genuinely improve the joke.
Never claim an event is real unless the user supplied its name.`;

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "You must be logged in to generate a caption." }, { status: 401 });
        }

        const body = await request.json();
        const prompt = String(body.prompt ?? "").trim();
        const vibe = String(body.vibe ?? "late-night").trim();

        if (!prompt || prompt.length > 500) {
            return NextResponse.json({ error: "Tell us what kind of night you want to create (500 characters max)." }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "AI is not configured yet. Add GEMINI_API_KEY to your Vercel environment variables." }, { status: 500 });
        }

        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                    contents: [{
                        role: "user",
                        parts: [{ text: `Create a ${vibe} NYC EDM caption based on this idea:\n${prompt}` }]
                    }],
                    generationConfig: { temperature: 0.9, maxOutputTokens: 160 }
                }),
            }
        );

        if (!geminiResponse.ok) {
            const detail = await geminiResponse.text();
            console.error("Gemini error:", detail);
            return NextResponse.json({ error: "The AI had a moment. Try generating again." }, { status: 502 });
        }

        const result = await geminiResponse.json();
        const output = result?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("").trim();

        if (!output) {
            return NextResponse.json({ error: "The AI returned an empty caption. Try another idea." }, { status: 502 });
        }

        const { data, error } = await supabase
            .from("ai_generations")
            .insert({
                created_by: user.id,
                prompt,
                vibe,
                output_text: output,
            })
            .select("id, prompt, vibe, output_text, created_by, created_at")
            .single();

        if (error) {
            console.error("Generation insert error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ generation: data });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
}
