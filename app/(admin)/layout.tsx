import type { Metadata } from "next";
import "@/app/globals.css";
import { UnreadProvider } from "../contexts/unreadContext";
import { SocketProvider } from "../contexts/socketContext";

export const metadata: Metadata = {
  title: "Assent | Backend Console",
  description: "Assent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased overflow-x-hidden overflow-y-auto`}>
        
        <UnreadProvider><SocketProvider>{children}</SocketProvider></UnreadProvider>
        
      </body>
    </html>
  );
}