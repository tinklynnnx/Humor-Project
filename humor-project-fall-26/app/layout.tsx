import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "RaveRank — Your scene. Your sound.",
    description: "Track festivals you have attended, discover electronic music artists, and vote on AI-generated festival media.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
        <body>{children}</body>
        </html>
    );
}
