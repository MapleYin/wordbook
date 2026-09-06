import type { Metadata } from "next";
import { Spectral, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const serif = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const sans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "English Words Collector",
  description: "A personal vocabulary notebook for words you meet while reading.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
