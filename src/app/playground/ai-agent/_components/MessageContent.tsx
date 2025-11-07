"use client";

import React, { type CSSProperties, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MessageContentProps {
  content: string;
  isUser: boolean;
}

export function MessageContent({ content, isUser }: MessageContentProps) {
  // Se for mensagem do usuário, renderiza como texto simples
  if (isUser) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  // Para mensagens do assistente, renderiza markdown
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }: { className?: string; children?: ReactNode }) {
            const match = /language-(\w+)/.exec(className ?? "");
            const language = match ? match[1] : "";
            const codeString = React.Children.toArray(children)
              .reduce<string>((acc, child) => {
                if (typeof child === "string" || typeof child === "number") {
                  return acc + child;
                }
                return acc;
              }, "")
              .replace(/\n$/, "");
            const isInline = !match;

            return !isInline && language ? (
              <div className="relative my-4 overflow-hidden rounded-lg border border-slate-200">
                <div className="bg-slate-800 px-4 py-2 text-xs text-slate-300">
                  {language}
                </div>
                <SyntaxHighlighter
                  style={vscDarkPlus as Record<string, CSSProperties>}
                  language={language}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: "1rem",
                    borderRadius: 0,
                    background: "#1e1e1e",
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
                      fontSize: "0.875rem",
                      lineHeight: "1.5",
                    },
                  }}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code
                className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono text-slate-800 before:content-[''] after:content-['']"
                {...props}
              >
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="mb-2 last:mb-0">{children}</p>;
          },
          h1({ children }) {
            return <h1 className="mb-2 mt-4 text-lg font-bold first:mt-0">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="mb-1 mt-2 text-sm font-semibold first:mt-0">{children}</h3>;
          },
          ul({ children }) {
            return <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="text-sm">{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-2 border-l-4 border-slate-300 pl-4 italic text-slate-600">
                {children}
              </blockquote>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 underline hover:text-sky-700"
              >
                {children}
              </a>
            );
          },
          strong({ children }) {
            return <strong className="font-semibold">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic">{children}</em>;
          },
          hr() {
            return <hr className="my-4 border-slate-200" />;
          },
          table({ children }) {
            return (
              <div className="my-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 border border-slate-200">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-slate-50">{children}</thead>;
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-slate-200">{children}</tbody>;
          },
          tr({ children }) {
            return <tr>{children}</tr>;
          },
          th({ children }) {
            return (
              <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">
                {children}
              </th>
            );
          },
          td({ children }) {
            return <td className="px-4 py-2 text-sm text-slate-700">{children}</td>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

