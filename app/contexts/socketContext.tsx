// contexts/socketContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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

  useEffect(() => {
    // connect once globally
    const s = io(process.env.SOCKET_SERVER_URL, { query: { role: "admin" } });
    setSocket(s);

    // Listen for message events globally
    s.on("message", ({ from, message }) => {
      console.log("New message from:", from, message);
      setTotalUnread((prev) => prev + 1); // increment global unread count
    });

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
