import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "BioTwin AI",
  description: "AI-Powered Medical Digital Twin Simulation and Consensus Platform",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <div className="fixed bottom-2 right-2 text-xs text-slate-500/50 pointer-events-none z-[9999] font-mono">
          © {new Date().getFullYear()} Mohit Thakur & Hitendra Kumar Vishwas. All Rights Reserved.
        </div>
      </body>
    </html>
  );
}
