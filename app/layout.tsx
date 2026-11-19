import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// The font variables sit on <html>: the App shell tokens live on :root and read them from there.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const DESCRIPTION = "Keep a list of app deep links (app://, custom schemes, paths), mark each Draft, Active or Done and copy the URL to hand off. Saved in your browser.";

export const metadata: Metadata = {
  title: "Deep Links | Bookchaowalit",
  description: DESCRIPTION,
  keywords: ["deeplinks", "deep link registry", "app routes"],
  authors: [{ name: "Bookchaowalit", url: "https://bookchaowalit.com" }],
  creator: "Bookchaowalit",
  metadataBase: new URL(SITE_URL),
  openGraph: { type: "website", title: "Deep Links | Bookchaowalit", description: DESCRIPTION, siteName: "Bookchaowalit" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
