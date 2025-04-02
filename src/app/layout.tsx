import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ominex - The Ultimate Social Media Hub",
  description: "Unify your social media experience with AI-powered features and cross-platform integration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-900 text-white min-h-screen`}>
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-64 bg-gray-800 p-4">
            <nav className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-blue-500">Ominex</span>
              </div>
              <ul className="space-y-2">
                <li>
                  <a href="/" className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded-lg">
                    <span>Home</span>
                  </a>
                </li>
                <li>
                  <a href="/profile" className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded-lg">
                    <span>Profile</span>
                  </a>
                </li>
                <li>
                  <a href="/messages" className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded-lg">
                    <span>Messages</span>
                  </a>
                </li>
                <li>
                  <a href="/nft" className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded-lg">
                    <span>NFT Gallery</span>
                  </a>
                </li>
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
