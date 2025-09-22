'use client';

import { useState, useRef, useEffect } from 'react';
import { FaRobot } from "react-icons/fa6";
import { IoMdCloseCircle } from "react-icons/io";
import { RiRobot3Fill } from "react-icons/ri";
import { IoMdSend } from "react-icons/io";

export default function Chatbot() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change or chat is opened
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (showChat) scrollToBottom();
  }, [messages, showChat]);

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
    <div className='w-full h-screen flex items-center justify-center'>
      <div className='text-2xl font-bold'>Dummy Website Based on Assent Steel</div>
      <div className="fixed bottom-6 right-6 z-50">
        {!showChat && (
          <button
            className="bg-green-500 hover:bg-green-600 text-black p-4 rounded-full shadow-lg"
            onClick={() => setShowChat(true)}
          >
            <FaRobot size={40} />
          </button>
        )}

        {showChat && (
          <div className="w-80 h-[500px] bg-white shadow-xl rounded-lg flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-green-500 text-black flex items-center justify-between p-3">
              <span className="font-semibold">Chatbot</span>
              <IoMdCloseCircle
                size={24}
                onClick={() => setShowChat(false)}
                className="cursor-pointer"
              />
            </div>

            {/* Messages */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2 text-black">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-md flex gap-2 ${msg.role === 'user' ? 'bg-blue-100 self-end' : 'bg-gray-100 self-start'}`}
                >
                  {msg.role === 'ai' && <RiRobot3Fill className='mt-1' />}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: msg.content.replace(
                        /<a /g,
                        '<a style="color: blue; text-decoration: underline;" '
                      ),
                    }}
                  />
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="p-2 rounded-md bg-gray-100 self-start flex items-center gap-2 animate-pulse">
                  <RiRobot3Fill className='mt-1' />
                  <span>AI is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex p-3 border-t gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 p-2 border rounded-l focus:outline-none  text-black"
                placeholder="Type your message..."
                disabled={loading}
              />
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-black rounded-full p-3 flex justify-center items-center"
                disabled={loading}
              >
                <IoMdSend size={20} className='ml-1' />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
