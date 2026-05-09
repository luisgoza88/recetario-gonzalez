"use client";

import dynamic from "next/dynamic";

// Lazy load react-markdown to reduce initial bundle
const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

interface FormattedMessageProps {
  content: string;
}

export function FormattedMessage({ content }: FormattedMessageProps) {
  return (
    <div className="text-sm space-y-1 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="my-1">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-4 my-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 my-1">{children}</ol>
          ),
          li: ({ children }) => <li className="my-0">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
