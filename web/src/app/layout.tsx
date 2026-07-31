import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "LineageGuard - AI-Powered Schema Change Governance",
  description: "AI-powered Schema Change Governance built on DataHub",
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen bg-black text-white antialiased`}>
        <QueryClientProvider client={queryClient}>
          <Sidebar />
          <Header />
          <main className="ml-64 mt-16 min-h-screen">
            {children}
          </main>
        </QueryClientProvider>
      </body>
    </html>
  );
}
