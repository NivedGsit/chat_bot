'use client';

import { useState } from 'react';

export default function Home() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    // Append user message
    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);

    // Call the API
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [...messages, userMessage],
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();

    if (data?.role && data?.content) {
      // Append AI response
      const aiMessage = { role: data.role, content: data.content };
      setMessages((prev) => [...prev, aiMessage]);
    }

    // Clear input
    setInput('');
  };

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        {messages.map((message, index) => (
          <div key={index} className="whitespace-pre-wrap p-2 border-b">
            <strong>{message.role === 'user' ? 'User' : 'AI'}:</strong> {message.content}
          </div>
        ))}

        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-2 border rounded"
            placeholder="Type your message..."
          />
          <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
