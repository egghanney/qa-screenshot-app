import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AetherQA // QA Testing & User Journey Intelligence Platform",
  description: "AI-powered living feature knowledge base and visual user journey mapping from application screenshots.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-qa-bg text-txt-primary antialiased selection:bg-neon selection:text-dark-chassis">
        {children}
      </body>
    </html>
  );
}
