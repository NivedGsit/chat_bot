"use client"

import React, { useState, useEffect, useRef } from "react"
import { io, Socket } from "socket.io-client"

const ChatUI = () => {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<{ from: string; text: string }[]>([])
  const [isHumanMode, setIsHumanMode] = useState(false)
  const [userId, setUserId] = useState("")

  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    let id = localStorage.getItem("userId")
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem("userId", id)
    }
    setUserId(id)
  }, [])

  useEffect(() => {
    if (!socketRef.current) {
      const socket = io("http://localhost:8080", {
        query: { role: "user", userId },
      })
      if(!userId) return
      socketRef.current = socket

      socket.on("connect", () => {
        console.log("User connected:", socket.id)
      })

      // Listen for incoming messages from admin
      socket.on("message", ({ from, message }: { from: string; message: string }) => {
        setMessages((prev) => [...prev, { from, text: message }])
      })

      socket.on("message-history", (messages: { from: string; text: string }[]) => {
        console.log(messages)
        setMessages(messages.map((msg) => ({ from: msg.from, text: msg.text })))
      })
    }

    return () => {
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [userId])

  const handleSend = () => {
    if (!isHumanMode || message.trim() === "") return
  
    // just send message, server knows who is user and who is admin
    socketRef.current?.emit("private-message", { message })
  
    setMessages((prev) => [...prev, { from: "user", text: message }])
    setMessage("")
  }

  const handleHuman = () => {
    setIsHumanMode(true)
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black">
      <div className="w-full max-w-md bg-black border-white border-2 shadow-lg rounded-lg flex flex-col h-[500px]">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-md ${
                msg.from === "user" ? "bg-blue-500 text-white self-end" : "bg-gray-200 text-black self-start"
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="flex p-3 border-t">
          <input
            type="text"
            className="flex-1 border rounded-lg px-3 py-2 focus:outline-none text-white bg-black"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={!isHumanMode}
          />
          <button
            onClick={handleSend}
            className="ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            disabled={!isHumanMode}
          >
            Send
          </button>
          <button
            onClick={handleHuman}
            className="ml-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
            disabled={isHumanMode}
          >
            Talk to Human
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatUI
