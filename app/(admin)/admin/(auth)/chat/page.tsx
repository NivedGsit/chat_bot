"use client"

import React, { useEffect, useState } from "react"
import { io, Socket } from "socket.io-client"

interface Chat {
  userId: string
  messages: { from: string; text: string }[]
}

const Page = () => {
  const [chats, setChats] = useState<Chat[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)

  

  useEffect(() => {
    const s = io("http://localhost:8080", { query: { role: "admin" } })
    setSocket(s)

    s.on("all-chats", (allChats: { userId: string, messages: { from: string, text: string }[] }[]) => {
        setChats(allChats)
      })
    // Initial user list
    // s.on("current-users", (userList: string[]) => {
    //   setChats(userList.map((id) => ({ userId: id, messages: [] })))
    // })

    // New user joins
    s.on("new-user-joined", (userId: string) => {
      setChats((prev) => [...prev, { userId, messages: [] }])
    })

    // User leaves
    s.on("user-left", (userId: string) => {
      setChats((prev) => prev.filter((chat) => chat.userId !== userId))
    })

    // Incoming messages
    s.on("message", ({ from, message }) => {
      setChats((prev) =>
        prev.map((chat) =>
          chat.userId === from
            ? { ...chat, messages: [...chat.messages, { from, text: message }] }
            : chat
        )
      )
    })

    return () => {
      s.disconnect()
    }
  }, [])

  const handleSend = (userId: string, text: string) => {
    if (!socket || !text.trim()) return
    socket.emit("private-message", { to: userId, message: text })
    setChats((prev) =>
      prev.map((chat) =>
        chat.userId === userId
          ? { ...chat, messages: [...chat.messages, { from: "admin", text }] }
          : chat
      )
    )
  }

  return (
    <div className="p-6 grid grid-cols-2 gap-4">
      {chats.map((chat) => (
        <div
          key={chat.userId}
          className="border p-4 rounded-lg flex flex-col h-80 bg-white"
        >
          <h2 className="font-bold mb-2 text-black">User: {chat.userId}</h2>
          <div className="flex-1 overflow-y-auto space-y-2 mb-2">
            {chat.messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-2 rounded ${
                  msg.from === "admin"
                    ? "bg-blue-500 text-white self-end"
                    : "bg-gray-200 text-black self-start"
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>
          <ChatInput onSend={(text) => handleSend(chat.userId, text)} />
        </div>
      ))}
    </div>
  )
}

const ChatInput = ({ onSend }: { onSend: (msg: string) => void }) => {
  const [text, setText] = useState("")

  const handleSend = () => {
    if (!text.trim()) return
    onSend(text)
    setText("")
  }

  return (
    <div className="flex">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1 border rounded-l px-2 py-1 text-black"
        placeholder="Type a message..."
      />
      <button
        onClick={handleSend}
        className="bg-blue-500 text-white px-3 rounded-r"
      >
        Send
      </button>
    </div>
  )
}

export default Page
