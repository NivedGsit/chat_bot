"use client"

import React, { useEffect, useRef, useState } from "react"
import { io, Socket } from "socket.io-client"
import { FaUserCircle } from "react-icons/fa";
import { TiUserDelete } from "react-icons/ti";
import { IoSendSharp } from "react-icons/io5";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialogue"
import { FaInfoCircle } from "react-icons/fa";
import { FaUserTie } from "react-icons/fa6";
import { FaUserLarge } from "react-icons/fa6";
import { IoMdCloseCircle } from "react-icons/io";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import ChatLoader from "./chatLoader";
import { useUnread } from "@/app/contexts/unreadContext";
import { MdOutlineDeleteSweep } from "react-icons/md";

interface Chat {
  userId: string
  messages: { from: string; text: string; }[]
  details: {
    name: string,
    organization: string,
    location: string,
    email: string
  }
  unreadCount: number
}

const Page = () => {
  const [chats, setChats] = useState<Chat[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const [currentChat, setCurrentChat] = useState<Chat | null>(null)
  const [loading, setLoading] = useState(true)
  const [oldChatsLoading,setOldChatsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [oldChats, setOldChats] = useState<Chat[]>([])
  const [hideSend, setHideSend] = useState(false)

  const { setTotalUnread } = useUnread();


  useEffect(() => {
    const total = chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    setTotalUnread(total);
  }, [chats]);


  useEffect(() => {
    console.log("admin connected")
    const s = io("http://localhost:8080", { query: { role: "admin" } })
    setSocket(s)

    s.on("all-chats", (allChats: Chat[]) => {
      console.log(allChats)
      setChats(allChats.map((chat: Chat) => ({
        ...chat,
        unreadCount: chat.unreadCount || 0
      })));
      setLoading(false)

      s.emit("get-all-chats");
    });
    // Initial user list
    // s.on("current-users", (userList: string[]) => {
    //   console.log(userList)
    //   setChats(userList.map((id) => (

    //     { userId: id, messages: [], details: { name: "", organization: "", location: "", email: "" }, unreadCount: 0 }
    //   )))
    //   setLoading(false)
    // })

    // New user joins
    s.on("new-user-joined", (userId: string) => {
      setChats((prev) => [...prev, { userId, messages: [], details: { name: "", organization: "", location: "", email: "" }, unreadCount: 1 }])
    })

    s.on("user-details", ({ userId, answers }) => {
      console.log("Received user details:", { userId, answers })

      setChats((prev) => {
        const existingChat = prev.find((chat) => chat.userId === userId)

        if (existingChat) {
          // ✅ Update details for existing chat
          return prev.map((chat) =>
            chat.userId === userId
              ? { ...chat, details: answers }
              : chat
          )
        } else {
          // ✅ Create new chat with details
          return [...prev, { userId, messages: [], details: answers, unreadCount: 1 }]
        }
      })
    })


     s.on("connect", () => {
    console.log("Admin connected");
      // <-- NOW it fires at correct time
  });

  s.on("all-chats-response", (allChats: Chat[]) => {
    console.log("ALL CHATS RESPONSE:", allChats);
    setOldChats(allChats);
    setOldChatsLoading(false)
  });


    // User leaves
    s.on("user-left", (userId: string) => {
      setChats((prev) => prev.filter((chat) => chat.userId !== userId))
      setCurrentChat((chat) => chat?.userId !== userId ? chat : null)
    })

    // Incoming messages
    s.on("message", ({ from, message, answers }) => {
      console.log("message called", message)
      setChats((prev) => {
        const existingChat = prev.find((chat) => chat.userId === from)
        if (existingChat) {
          const isCurrentChatOpen = currentChat?.userId === from
          // Append to existing chat
          return prev.map((chat) =>
            chat.userId === from
              ? { ...chat, messages: [...chat.messages, { from, text: message, answers }], unreadCount: isCurrentChatOpen ? chat.unreadCount : chat.unreadCount + 1 }
              : chat
          )
        } else {
          // 👇 Create a new chat for this user
          return [
            ...prev,
            { userId: from, messages: [{ from, text: message, answers }], details: { name: "", organization: "", location: "", email: "" }, unreadCount: 1 },
          ]
        }
      })
    })


    return () => {
      s.disconnect()
    }
  }, [])

    //   useEffect(() => {
    //   setOldChats(
    //     oldChats.filter(
    //       (old) => !chats.some((live) => live.userId === old.userId)
    //     )
    //   );
    // }, [chats]);

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

  const handleLeave = (userId: string) => {
    if (!socket) return
    socket.emit("kick-user", userId)
    setChats((prev) => prev.filter((chat) => chat.userId !== userId))
  }

  const handleDeleteHistory = (userId: string) => {
    if (!socket) return
    socket.emit("delete-history", userId)
    setOldChats((prev) => prev.filter((chat) => chat.userId !== userId))
  }

  useEffect(() => {
    if (!currentChat) return
    const updated = chats.find(c => c.userId === currentChat.userId)
    if (updated) setCurrentChat(updated)
  }, [chats])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!currentChat) return;
    scrollToBottom();
  }, [currentChat?.messages]);

  useEffect(() => {
    if (oldChats) {
      console.log(oldChats)
    }
  }, [oldChats])

  const setupCurrentChat = (chat: Chat, disableSend?: boolean) => {
    if (disableSend) {
      setHideSend(true)
      setCurrentChat(chat);
    } else {
      setCurrentChat(chat);
      socket?.emit("reset-unread", chat.userId);
      setChats((prev) =>
        prev.map((c) =>
          c.userId === chat.userId ? { ...c, unreadCount: 0 } : c
        )
      );
      setHideSend(false)
    }
  }

  return (
    <div className="grid grid-cols-4 gap-x-3 h-screen">

      {/* <div className="grid grid-cols-1 gap-4 col-span-3 h-full p-4">
        
        

        {currentChat && <div
          key={currentChat?.userId}
          className="relative rounded-lg flex flex-col h-full shadow-xl"
        >
          <div className="flex justify-between items-center  bg-blue-300 p-4 rounded-t-lg">
            <h2 className="font-bold text-black">Name : {currentChat?.details?.name}</h2>

            <div className="flex items-center gap-5">
              <Dialog>
                <DialogTrigger><FaInfoCircle className="text-2xl text-white" /></DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-center">Details</DialogTitle>
                    <DialogDescription className="text-md">
                      <span className="font-bold">Name</span> : {currentChat?.details?.name}
                      <br />
                      <span className="font-bold">Organization</span> : {currentChat?.details?.organization}
                      <br />
                      <span className="font-bold">Location</span> : {currentChat?.details?.location}
                      <br />
                      <span className="font-bold">Email</span> : {currentChat?.details?.email}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose>Close</DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <IoMdCloseCircle className="text-3xl text-white" onClick={() => setCurrentChat(null)} />
            </div>
          </div>

          <div className="overflow-y-hidden space-y-2 flex flex-col p-4 h-full">
            <div className="flex flex-col space-y-2 overflow-y-auto h-[90%]">
            {currentChat && currentChat?.messages.map((msg, idx) => (
              <div key={idx} className={`flex items-center gap-2 ${msg.from == "admin" ? "justify-end" : "justify-start"}`}>
                {msg.from == "admin" ? <FaUserTie className="text-lg" /> : <FaUserLarge />}
                <div
                  key={idx}
                  className={`p-2 rounded ${msg.from === "admin"
                    ? "bg-blue-500 text-white self-end w-fit"
                    : "bg-gray-200 text-black self-start w-fit"
                    }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            </div>
            <div ref={messagesEndRef}></div>
          </div>
          <ChatInput onSend={(text) => handleSend(currentChat?.userId, text)} />
        </div>
        }

      </div> */}





      <div className="col-span-3 flex flex-col h-screen p-4">
        {!currentChat && <div className="flex flex-col justify-center items-center h-full">
          <DotLottieReact
                  src="https://lottie.host/c7edd507-1c1a-45b4-b7de-4cbb0296752c/ckkjkvv8pf.lottie"
                  loop
                  autoplay
                  className="w-48 h-24"
                />
        <p className="text-slate-500 text-md text-center">Select a user from the list to continue.</p>
        </div>
        }
          
        {currentChat && <div className="flex justify-between items-center  bg-blue-300 p-4 rounded-t-lg">
          <h2 className="font-bold text-black">Name : {currentChat?.details?.name}</h2>

          <div className="flex items-center gap-5">
            <Dialog>
              <DialogTrigger><FaInfoCircle className="text-2xl text-white" /></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-center">Details</DialogTitle>
                  <DialogDescription className="text-md">
                    <span className="font-bold">Name</span> : {currentChat?.details?.name}
                    <br />
                    <span className="font-bold">Organization</span> : {currentChat?.details?.organization}
                    <br />
                    <span className="font-bold">Location</span> : {currentChat?.details?.location}
                    <br />
                    <span className="font-bold">Email</span> : {currentChat?.details?.email}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose>Close</DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <IoMdCloseCircle className="text-3xl text-white" onClick={() => setCurrentChat(null)} />
          </div>
        </div>}
        {currentChat && <div className="flex-1 overflow-y-hidden p-4 space-y-2 shadow-2xl">
          <div className="flex flex-col space-y-2 overflow-y-auto h-[100%] p-2">
            {currentChat && currentChat?.messages.map((msg, idx) => (
              <div key={idx} className={`flex items-center gap-2 ${msg.from == "admin" ? "justify-end" : "justify-start"}`}>
                {msg.from == "admin" ? <FaUserTie className="text-lg" /> : <FaUserLarge />}
                <div
                  key={idx}
                  className={`p-2 rounded ${msg.from === "admin"
                    ? "bg-blue-500 text-white self-end w-fit"
                    : "bg-gray-200 text-black self-start w-fit"
                    }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef}></div>
          </div>
        </div>}
        {!hideSend && currentChat && <ChatInput onSend={(text) => handleSend(currentChat?.userId as string, text)} />}

      </div>

      <div className="relative flex w-full flex-col border border-slate-200 bg-white shadow-sm h-screen">

        {/* ---------- ONLINE USERS ---------- */}
        <div className="flex flex-col h-1/2">
          <p className="p-3 text-center font-bold bg-green-600 text-white">
            Online Users
          </p>

          <nav className="flex flex-col gap-1 p-1.5 flex-1 overflow-y-auto">

            {loading ? (
              <ChatLoader />
            ) : chats.length === 0 ? (
              <div className="flex flex-col justify-center items-center">
                <DotLottieReact
                  src="https://lottie.host/f4ac59f3-6db9-45c8-bb25-3dfda46fd1ce/cMVVmbkdOv.lottie"
                  loop
                  autoplay
                  className="w-48 h-24"
                />
                <p className="text-slate-500 text-sm text-center">
                  Looks like it&apos;s quiet here...<br />No one&apos;s online yet!
                </p>
              </div>
            ) : (
              chats.map((chat) =>
                chat?.details?.name && (
                  <div
                    key={chat.userId}
                    role="button"
                    onClick={() => setupCurrentChat(chat)}
                    className="text-slate-800 cursor-pointer flex justify-between w-full items-center rounded-md p-3 transition-all hover:bg-slate-100"
                  >
                    <div className="flex gap-3 items-center">
                      <div className="relative">
                        <FaUserCircle className="text-3xl" />
                        {currentChat?.userId !== chat.userId &&
                          chat?.unreadCount > 0 && (
                            <div className="animate-bounce absolute inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 border-2 border-white rounded-full -top-1 -end-2">
                              {chat?.unreadCount > 9 ? "9+" : chat?.unreadCount}
                            </div>
                          )}
                      </div>

                      <div>
                        <h6 className="text-slate-800 font-medium">{chat.details.name}</h6>
                        <p className="text-slate-500 text-sm pl-1">{chat.details.email}</p>
                      </div>
                    </div>

                    <TiUserDelete
                      size={24}
                      className="cursor-pointer text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLeave(chat.userId);
                        setCurrentChat(null);
                      }}
                    />
                  </div>
                )
              )
            )}
          </nav>
        </div>

        {/* ---------- CHAT HISTORY ---------- */}
        <div className="flex flex-col h-1/2">
          <p className="p-3 text-center font-bold bg-slate-600 text-white">
            Chat History
          </p>

          <nav className="flex flex-col gap-1 flex-1 p-1.5 overflow-y-auto bg-slate-200">
            {oldChatsLoading ? <ChatLoader /> : oldChats.length == 0 ? (<p className="text-slate-500 text-sm text-center">No chat history yet</p>) : oldChats?.map((chat) => (
              <div
                key={chat.userId}
                role="button"
                onClick={() => setupCurrentChat(chat,true)}
                className="text-slate-800 cursor-pointer flex justify-between w-full items-center rounded-md p-3 transition-all hover:bg-slate-100"
              >
                <div className="flex gap-3 items-center">
                  <div className="relative">
                    <FaUserCircle className="text-3xl" />
                    {/* {currentChat?.userId !== chat.userId &&
                chat?.unreadCount > 0 && (
                  <div className="animate-bounce absolute inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 border-2 border-white rounded-full -top-1 -end-2">
                    {chat?.unreadCount > 9 ? "9+" : chat?.unreadCount}
                  </div>
                )} */}
                  </div>

                  <div>
                    <h6 className="text-slate-800 font-medium">{chat.details?.name}</h6>
                    <p className="text-slate-500 text-sm pl-1">{chat.details?.email}</p>
                  </div>
                </div>

                <MdOutlineDeleteSweep
                  size={24}
                  className="cursor-pointer text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteHistory(chat.userId);
                  }}
                />
              </div>
            ))}
          </nav>
        </div>

      </div>



    </div>
  )
}

const ChatInput = ({ onSend }: { onSend: (msg: string) => void }) => {
  const [text, setText] = useState("")

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    onSend(text)
    setText("")
  }

  return (
    <form className="flex p-4 shadow-2xl rounded-b-xl bg-white" onSubmit={handleSend}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1 rounded-l px-2 py-1 text-black shadow-2xl border border-slate-200 focus:outline-none"
        placeholder="Type a message..."
      />
      <button
        type="submit"
        className="bg-blue-500 text-white px-3 rounded-r shadow-2xl border border-slate-200"
      >
        <IoSendSharp />
      </button>
    </form>
  )
}

export default Page
