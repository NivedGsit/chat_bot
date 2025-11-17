"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface UnreadContextType {
  totalUnread: number;
  setTotalUnread: React.Dispatch<React.SetStateAction<number>>;
}

const UnreadContext = createContext<UnreadContextType | undefined>(undefined);

export const UnreadProvider = ({ children }: { children: React.ReactNode }) => {
  const [totalUnread, setTotalUnread] = useState(0);

    useEffect(() => {
  const saved = localStorage.getItem("totalUnread");
  console.log(saved)
  if (saved) setTotalUnread(parseInt(saved));
}, []);

useEffect(() => {
  localStorage.setItem("totalUnread", totalUnread.toString());
}, [totalUnread]);


  return (
    <UnreadContext.Provider value={{ totalUnread, setTotalUnread }}>
      {children}
    </UnreadContext.Provider>
  );
};

export const useUnread = () => {
  const context = useContext(UnreadContext);
  if (!context) {
    throw new Error("useUnread must be used within an UnreadProvider");
  }
  return context;
};
