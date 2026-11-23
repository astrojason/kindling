import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { breakUpProse } from "@random-knowledge/shared/prose";

const text = "text-sm leading-relaxed text-fg";

/** A note field rendered as Markdown (never raw HTML), with one long paragraph broken into short ones. */
export function MarkdownBody({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }: { children?: ReactNode }) => <p className={`mb-3 last:mb-0 ${text}`}>{children}</p>,
        strong: ({ children }: { children?: ReactNode }) => <strong className="font-bold text-accent">{children}</strong>,
        em: ({ children }: { children?: ReactNode }) => <em className="italic">{children}</em>,
        h1: ({ children }: { children?: ReactNode }) => <h2 className="mb-2 mt-4 font-heading text-lg font-bold text-fg-strong">{children}</h2>,
        h2: ({ children }: { children?: ReactNode }) => <h3 className="mb-2 mt-4 font-heading text-base font-bold text-fg-strong">{children}</h3>,
        h3: ({ children }: { children?: ReactNode }) => <h4 className="mb-2 mt-3 text-xs font-extrabold uppercase tracking-wide text-fg-muted">{children}</h4>,
        ul: ({ children }: { children?: ReactNode }) => <ul className={`mb-3 list-disc space-y-1 pl-5 ${text}`}>{children}</ul>,
        ol: ({ children }: { children?: ReactNode }) => <ol className={`mb-3 list-decimal space-y-1 pl-5 ${text}`}>{children}</ol>,
        code: ({ children }: { children?: ReactNode }) => <code className="rounded bg-accent-soft px-1 text-[0.9em] text-accent">{children}</code>,
        pre: ({ children }: { children?: ReactNode }) => <pre className="my-3 overflow-x-auto rounded-sm bg-accent-soft p-3 text-xs [&_code]:bg-transparent [&_code]:p-0">{children}</pre>,
        blockquote: ({ children }: { children?: ReactNode }) => <blockquote className={`my-3 border-l-2 border-accent pl-4 text-fg-muted ${text}`}>{children}</blockquote>,
        a: ({ href, children }: { href?: string; children?: ReactNode }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">{children}</a>
        ),
        hr: () => <hr className="my-4 border-border" />,
        del: ({ children }: { children?: ReactNode }) => <del className="text-fg-muted line-through">{children}</del>,
        table: ({ children }: { children?: ReactNode }) => (
          <div className="my-3 overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>
        ),
        th: ({ children }: { children?: ReactNode }) => <th className="border border-border bg-accent-soft px-3 py-2 text-left text-xs font-extrabold uppercase tracking-wide text-fg-muted">{children}</th>,
        td: ({ children }: { children?: ReactNode }) => <td className="border border-border px-3 py-2 text-fg">{children}</td>,
      }}
    >
      {breakUpProse(children)}
    </ReactMarkdown>
  );
}
