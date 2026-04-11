import type { Metadata } from "next";
import { DM_Mono, DM_Sans } from "next/font/google";
import { APP_NAME } from "../constants/app";
import "./globals.css";

const dmSans = DM_Sans({
    subsets: ["latin"],
    weight: ["400", "500", "700"],
    variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
    subsets: ["latin"],
    weight: ["400", "500"],
    variable: "--font-dm-mono",
});

export const metadata: Metadata = {
    title: `${APP_NAME} | Business Portal`,
    description: `Aggregator and Admin Dashboards for ${APP_NAME} Scrap Marketplace`,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${dmSans.variable} ${dmMono.variable} font-sans antialiased`}>
                {children}
            </body>
        </html>
    );
}
