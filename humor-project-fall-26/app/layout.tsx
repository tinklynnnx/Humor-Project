import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "EDM. — AI ideas for real NYC nights",
    description: "Create AI nightlife captions, vote with the crowd, and discover your next NYC EDM night.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
        <body>{children}</body>
        </html>
    );
}
