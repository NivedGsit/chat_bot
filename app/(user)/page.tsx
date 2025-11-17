'use client';

import { useState, useRef, useEffect } from 'react';
import { IoMdCloseCircle } from "react-icons/io";
import { RiRobot3Fill } from "react-icons/ri";
import { IoMdSend } from "react-icons/io";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { io, Socket } from "socket.io-client"

export default function Chatbot() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([{ role: "assistant", content: "Hello! I'm here to help you. How can I assist you today?" }]);
  const [input, setInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [humanMessage, setHumanMessage] = useState("")
  const [humanMessages, setHumanMessages] = useState<{ from: string; text: string }[]>([])
  const [isHumanMode, setIsHumanMode] = useState(false)
  const [userId, setUserId] = useState("")
  const [, setIsKicked] = useState(false)
  const [inputError, setInputError] = useState("")

  const socketRef = useRef<Socket | null>(null)

  const [questionIndex, setQuestionIndex] = useState(0)

  const firstSetOfQuestions = [
    { role: "assistant", content: "What is your name" },
    { role: "assistant", content: "What is your organization" },
    { role: "assistant", content: "What is your location" },
    { role: "assistant", content: "What is your email" },
  ]

  const [answers, setAnswers] = useState<string[]>([]);
  const [firstSetOfQuestionMode, setFirstSetOfQuestionMode] = useState(false)


  useEffect(() => {
    const handleBeforeUnload = () => {
      const uid = localStorage.getItem("userId");
      if (uid && socketRef.current) {
        socketRef.current.emit("user-disconnected", uid);
      }
      localStorage.removeItem("userId");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);



  useEffect(() => {
    let id = localStorage.getItem("userId")
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem("userId", id)
    }
    setUserId(id)
  }, [])

  useEffect(() => {
    // ⬅️ only connect if human mode ON


    if (!socketRef.current && userId) {
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL, {
        query: { role: "user", userId },
      })
      socketRef.current = socket

      socket.on("connect", () => {
        console.log("User connected:", socket.id)
      })


      socket.on("message", ({ from, message }: { from: string; message: string }) => {
        console.log("admin sends message")
        setHumanMessages((prev) => [...prev, { from, text: message }])
      })

      socket.on("message-history", (messages: { from: string; text: string }[]) => {
        setHumanMessages(messages.map((msg) => ({ from: msg.from, text: msg.text })))
      })

      socket.on("kicked", () => {
        console.log("kicked")
        socket.disconnect()
        socketRef.current = null
        setIsHumanMode(false)
        setIsKicked(true)
        setMessages([{ role: "assistant", content: "Hello! I'm here to help you. How can I assist you today?" }])
        setHumanMessages([])
        const id = crypto.randomUUID()
        localStorage.setItem("userId", id)
        setUserId(id)
      })

      socket.on("session-ended", () => {
        console.log("session ended")

        // remove id from localStorage if user just closed the page or lost connection
      })

    }

    return () => {
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [userId])

  useEffect(() => {
    if (humanMessages.length > 0) {
      setIsHumanMode(true)
    }
  }, [humanMessages])


  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isHumanMode || humanMessage.trim() === "") return

    // just send message, server knows who is user and who is admin
    socketRef.current?.emit("private-message", { message: humanMessage })

    setHumanMessages((prev) => [...prev, { from: "user", text: humanMessage }])
    setHumanMessage("")
  }

  const handleHuman = () => {
    setFirstSetOfQuestionMode(true);
    setMessages([firstSetOfQuestions[0]]); // start with first question
    setQuestionIndex(0);
  };

  const handleFirstQuestions = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

switch (questionIndex) {
  case 0: // Name
    if (input.trim().length < 3) {
      setInputError("Name must be at least 3 characters.");
      return;
    }
    if (!/^[A-Za-z\s]+$/.test(input.trim())) {
      setInputError("Name should contain only letters.");
      return;
    }
    break;

  case 1: // Organization
    if (input.trim().length < 2) {
      setInputError("Organization name must be at least 2 characters.");
      return;
    }
    break;

  case 2: // Location
    if (input.trim().length < 2) {
      setInputError("Location must be at least 2 characters.");
      return;
    }
    break;

  case 3: // Email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim())) {
      setInputError("Please enter a valid email address.");
      return;
    }
    break;

  default:
    break;
}


    const updatedAnswers = [...answers];
    updatedAnswers[questionIndex] = input.trim();
    setAnswers(updatedAnswers);
    setMessages(prev => [...prev, { role: "user", content: input }]);
    setInput('');

    const nextIndex = questionIndex + 1;

    if (nextIndex < firstSetOfQuestions.length) {
      setMessages(prev => [...prev, firstSetOfQuestions[nextIndex]]);
      setQuestionIndex(nextIndex);
      setInputError("")
    } else {
      setFirstSetOfQuestionMode(false);
      setIsHumanMode(true);

      console.log("✅ Collected Answers:", updatedAnswers);

      // 🟩 Convert array into an object before emitting
      const userDetails = {
        name: updatedAnswers[0],
        organization: updatedAnswers[1],
        location: updatedAnswers[2],
        email: updatedAnswers[3],
      };

      socketRef.current?.emit("user-details", {
        userId,
        answers: userDetails, // ✅ Send structured object, not array
      });

      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Thank you! A human representative will join shortly." },
      ]);

      setInputError("")
    }
  };

  // Scroll to bottom whenever messages change or chat is opened
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (showChat) scrollToBottom();
  }, [messages, showChat, humanMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [...messages, userMessage] }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (data?.role && data?.content) {
        setMessages(prev => [...prev, { role: data.role, content: data.content }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className='w-full h-screen flex items-center justify-center bg-black'>
      <div className='text-2xl font-bold text-white'>Dummy Website Based on Assent Steel</div>
      <div className="fixed bottom-6 right-3 z-50">
        <div className="bottom-4 right-1 absolute">
          {!showChat && (

            <DotLottieReact
              src="https://lottie.host/c3c599e0-b015-407f-879a-d4e2ded62980/5EkkWeGtql.lottie"
              loop
              autoplay
              className='w-48 h-24'
              onClick={() => setShowChat(true)}
            />

          )}
        </div>

        <div
          className={`w-80 h-[500px] bg-white shadow-xl rounded-lg flex flex-col overflow-hidden
  transition-all duration-1000 ease-in-out
  ${showChat ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5 pointer-events-none"}
  `}
        >
          {/* Header */}
          <div className="bg-blue-400 text-black flex items-center justify-between p-3">
            <span className="font-semibold">Chatbot</span>
            <IoMdCloseCircle
              size={24}
              onClick={() => setShowChat(false)}
              className="cursor-pointer"
            />
          </div>

          {isHumanMode && humanMessages.findIndex((msg) => msg.from == "admin") == -1 && (
            <p className='text-[12px] text-black text-center mt-2'>An admin will join shortly, Please wait</p>
          )}

          {/* Messages */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 text-black">
            {!isHumanMode && messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-md flex items-start gap-2 max-w-full ${msg.role === "user"
                  ? "bg-blue-100 self-start"
                  : "bg-gray-100 self-start"
                  }`}
              >
                {/* Show robot icon for AI */}
                {msg.role !== "user" && (
                  <RiRobot3Fill className="h-4 w-4 text-blue-400 flex-shrink-0 mt-1" />
                )}

                <span
                  className="text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: msg.content.replace(
                      /<a /g,
                      '<a style="color: blue; text-decoration: underline;" '
                    ),
                  }}
                />
              </div>
            ))}

            {isHumanMode && humanMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-md flex items-start gap-2 max-w-full ${msg.from === "user"
                  ? "bg-blue-100 self-start"
                  : "bg-gray-100 self-start"
                  }`}
              >
                {/* Show robot icon for AI */}
                {msg.from !== "user" && (
                  <RiRobot3Fill className="h-4 w-4 text-blue-400 flex-shrink-0 mt-1" />
                )}

                <span
                  className="text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: msg.text.replace(
                      /<a /g,
                      '<a style="color: blue; text-decoration: underline;" '
                    ),
                  }}
                />
              </div>
            ))}

            {!isHumanMode && messages.length > 2 && messages[messages.length - 1].role === "assistant" && !firstSetOfQuestionMode && <p className='text-[12px]'>Not satisfied with the response? <span className="text-blue-400 cursor-pointer" onClick={handleHuman}>Talk to a human</span></p>}


            {/* Loading indicator */}
            {loading && (
              <div className="p-2 rounded-md bg-gray-100 self-start flex items-center gap-2 animate-pulse">
                <RiRobot3Fill className='mt-1 h-4 w-4 text-blue-400 flex-shrink-0' />
                <span className="text-sm leading-relaxed">AI is typing...</span>
              </div>
            )}

            {inputError && <p className='text-red-500 text-sm'>{inputError}</p>}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={
            firstSetOfQuestionMode
              ? handleFirstQuestions
              : isHumanMode
                ? handleSend
                : handleSubmit
          } className="flex p-3 border-t border-slate-400 gap-2">
            <input
              type="text"
              value={isHumanMode ? humanMessage : input}
              onChange={(e) => isHumanMode ? setHumanMessage(e.target.value) : setInput(e.target.value)}
              className="flex-1 p-2 border rounded-l focus:outline-none  text-black"
              placeholder="Type your message..."
              disabled={loading}
            />
            <button
              type="submit"
              className={`hover:bg-blue-500 text-black rounded-full p-3 flex justify-center items-center ${!isHumanMode ? "bg-blue-400" : "bg-green-400"}`}
              disabled={loading}
            >
              <IoMdSend size={20} className='ml-1' />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
