import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { MarkdownBody } from "./MarkdownBody";

const html = (md: string) => renderToStaticMarkup(createElement(MarkdownBody, null, md));

it("renders bold text and lists", () => {
  const out = html("A **key** idea\n\n- one\n- two");
  expect(out).toContain("<strong");
  expect(out).toContain("key</strong>");
  expect(out).toContain("<ul");
  expect(out).toContain("one</li>");
});

it("renders GitHub-flavoured tables and strikethrough", () => {
  const out = html("| a | b |\n|---|---|\n| 1 | 2 |\n\n~~gone~~");
  expect(out).toContain("<table");
  expect(out).toContain("<del");
});

it("opens links in a new tab without leaking the opener", () => {
  const out = html("[docs](https://example.com/a)");
  expect(out).toContain('href="https://example.com/a"');
  expect(out).toContain('target="_blank"');
  expect(out).toMatch(/rel="[^"]*noopener[^"]*"/);
});

it("never renders a javascript: link or raw HTML from a note", () => {
  expect(html("[x](javascript:alert(1))")).not.toContain("javascript:");
  const out = html("hello <script>alert(1)</script> <img src=x onerror=alert(1)>");
  expect(out).not.toContain("<script");
  expect(out).not.toContain("<img");
});

it("breaks one long unstructured paragraph into shorter ones", () => {
  const sentence = "This is a reasonably long sentence about nothing in particular. ";
  const out = html(sentence.repeat(8).trim());
  expect((out.match(/<p/g) ?? []).length).toBeGreaterThan(1);
});
