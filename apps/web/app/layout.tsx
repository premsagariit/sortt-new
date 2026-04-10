import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Sortt | Business Portal",
    description: "Aggregator and Admin Dashboards for Sortt Scrap Marketplace",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="antialiased">
                {children}
            </body>
        </html>
    );
}
