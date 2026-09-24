import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "EDM Events",
    description: "EDM events database",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body>{children}</body>
        </html>
    );
}