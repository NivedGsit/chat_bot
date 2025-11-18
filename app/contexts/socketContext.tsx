// contexts/socketContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useUnread } from "./unreadContext";

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { setTotalUnread } = useUnread();

  const notificationSound = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
    // Setup audio once
    notificationSound.current = new Audio("/notification.wav");
  }, []);

  useEffect(() => {
    // connect once globally
    const s = io(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL, { query: { role: "admin" } });
    setSocket(s);

    // Listen for message events globally
    s.on("message", ({ from, message }) => {
      console.log("New message from:", from, message);
      setTotalUnread((prev) => prev + 1); // increment global unread count
      notificationSound.current?.play().catch(() => { });
    });

    s.on("user-details", () => {
      console.log("New user joined");
      setTotalUnread((prev) => prev + 1);
      notificationSound.current?.play().catch(() => { });
    })

    return () => {
      s.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
