"use client";

import React from "react";
import Link from "next/link";
import { MessageContent } from "./_components/MessageContent";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

const initialMessages: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Hi there! I'm a preview of our upcoming AI assistant for building simplicity HL smart contracts. Ask me anything and I'll walk you through the next steps.",
  },
];

export default function AiAgentPage() {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [input, setInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) {
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    // Cria mensagem de assistente vazia para streaming
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Prepara histórico de conversa
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Chama a API de streaming
      const response = await fetch("/api/ai-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Processa streaming
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            try {
              const event = JSON.parse(line);
              
              if (event.type === "text") {
                accumulatedText = event.data.accumulated;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedText }
                      : msg
                  )
                );
              } else if (event.type === "done") {
                setIsSending(false);
              } else if (event.type === "error") {
                throw new Error(event.data.error || "Unknown error");
              }
            } catch (parseError) {
              // Ignora erros de parsing de linhas incompletas
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content:
                  "Sorry, I encountered an error. Please try again.",
              }
            : msg
        )
      );
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Fixed Header */}
      <div className="border-b bg-white px-6 py-5 shadow-sm">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-wide text-sky-600 uppercase">
              Preview
            </p>
            <h1 className="text-lg font-semibold text-slate-900">
              AI Agent Playground
            </h1>
          </div>
          <Link
            href="/playground"
            className="text-sm font-medium text-sky-600 transition hover:text-sky-700"
          >
            ← Back to playground
          </Link>
        </div>
      </div>

      {/* Scrollable Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto bg-slate-50"
      >
        <div className="mx-auto w-full max-w-4xl px-6 py-6">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    message.role === "user"
                      ? "bg-sky-600 text-white"
                      : "border border-slate-200 bg-white text-slate-900"
                  }`}
                >
                  {message.content ? (
                    <MessageContent
                      content={message.content}
                      isUser={message.role === "user"}
                    />
                  ) : message.role === "assistant" && isSending ? (
                    <span className="text-slate-500">...</span>
                  ) : null}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Fixed Input Form at Bottom */}
      <form onSubmit={handleSend} className="bg-gray-50 px-6 py-4 shadow-lg">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:flex-row">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend(
                  event as unknown as React.FormEvent<HTMLFormElement>,
                );
              }
            }}
            placeholder="Share what you want to build, and we'll guide you…"
            rows={3}
            disabled={isSending}
            className="w-full resize-none overflow-y-auto rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:opacity-50 disabled:cursor-not-allowed sm:flex-1"
            aria-label="Message"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="rounded-xl bg-sky-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
