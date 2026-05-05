import { describe, expect, it } from "vitest";
import { extractMetaTags } from "../../../src/utils/meta-tags.js";

describe("extractMetaTags", () => {
  describe("well-formed OpenGraph tags", () => {
    it("extracts standard og:* tags using property attribute", () => {
      const html = `
        <html><head>
          <title>Hello World</title>
          <meta property="og:title" content="OG Title" />
          <meta property="og:description" content="OG Desc" />
          <meta property="og:image" content="https://example.com/img.png" />
          <meta property="og:url" content="https://example.com/" />
        </head></html>
      `;
      const result = extractMetaTags(html);
      expect(result.title).toBe("Hello World");
      expect(result.og.get("title")).toBe("OG Title");
      expect(result.og.get("description")).toBe("OG Desc");
      expect(result.og.get("image")).toBe("https://example.com/img.png");
      expect(result.og.get("url")).toBe("https://example.com/");
    });

    it("extracts og:* tags declared via name attribute", () => {
      const html = `<meta name="og:title" content="From Name">`;
      const result = extractMetaTags(html);
      expect(result.og.get("title")).toBe("From Name");
    });

    it("extracts twitter:* tags from name attribute", () => {
      const html = `
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="Tweet Title">
        <meta name="twitter:site" content="@example">
      `;
      const result = extractMetaTags(html);
      expect(result.twitter.get("card")).toBe("summary_large_image");
      expect(result.twitter.get("title")).toBe("Tweet Title");
      expect(result.twitter.get("site")).toBe("@example");
    });

    it("captures article:* tags under their full key", () => {
      const html = `<meta property="article:published_time" content="2024-01-01" />`;
      const result = extractMetaTags(html);
      expect(result.og.get("article:published_time")).toBe("2024-01-01");
    });

    it("captures itemprop and generic name meta tags", () => {
      const html = `
        <meta itemprop="image" content="https://example.com/itemprop.png">
        <meta name="description" content="Plain description">
        <meta name="author" content="Jane Doe">
      `;
      const result = extractMetaTags(html);
      expect(result.itemprop.get("image")).toBe("https://example.com/itemprop.png");
      expect(result.meta.get("description")).toBe("Plain description");
      expect(result.meta.get("author")).toBe("Jane Doe");
    });

    it("handles single-quoted, unquoted, and mixed-case attributes", () => {
      const html = `
        <META PROPERTY='og:title' CONTENT='Single Quoted' />
        <meta name=description content=Unquoted>
      `;
      const result = extractMetaTags(html);
      expect(result.og.get("title")).toBe("Single Quoted");
      expect(result.meta.get("description")).toBe("Unquoted");
    });

    it("decodes HTML entities in titles and content", () => {
      const html = `
        <title>Tom &amp; Jerry &#39;Show&#39; &#x26; Friends</title>
        <meta property="og:description" content="A &lt;b&gt;bold&lt;/b&gt; &quot;quote&quot;">
      `;
      const result = extractMetaTags(html);
      expect(result.title).toBe("Tom & Jerry 'Show' & Friends");
      expect(result.og.get("description")).toBe('A <b>bold</b> "quote"');
    });
  });

  describe("missing tags", () => {
    it("returns empty maps and empty title for HTML with no meta tags", () => {
      const result = extractMetaTags("<html><body><p>nothing</p></body></html>");
      expect(result.title).toBe("");
      expect(result.og.size).toBe(0);
      expect(result.twitter.size).toBe(0);
      expect(result.meta.size).toBe(0);
      expect(result.itemprop.size).toBe(0);
    });

    it("skips meta tags missing a content attribute", () => {
      const html = `
        <meta property="og:title">
        <meta property="og:description" content="">
        <meta property="og:image" content="kept.png">
      `;
      const result = extractMetaTags(html);
      expect(result.og.has("title")).toBe(false);
      expect(result.og.has("description")).toBe(false);
      expect(result.og.get("image")).toBe("kept.png");
    });

    it("returns empty title for an empty input string", () => {
      const result = extractMetaTags("");
      expect(result.title).toBe("");
      expect(result.og.size).toBe(0);
    });
  });

  describe("duplicate tags", () => {
    it("keeps the last value when og tags repeat", () => {
      const html = `
        <meta property="og:title" content="First">
        <meta property="og:title" content="Second">
        <meta property="og:title" content="Third">
      `;
      const result = extractMetaTags(html);
      expect(result.og.get("title")).toBe("Third");
      expect(result.og.size).toBe(1);
    });

    it("keeps the last value across mixed property/name og declarations", () => {
      const html = `
        <meta property="og:title" content="ByProperty">
        <meta name="og:title" content="ByName">
      `;
      const result = extractMetaTags(html);
      expect(result.og.get("title")).toBe("ByName");
    });

    it("dedupes twitter and itemprop tags by keeping the last occurrence", () => {
      const html = `
        <meta name="twitter:card" content="summary">
        <meta name="twitter:card" content="summary_large_image">
        <meta itemprop="image" content="a.png">
        <meta itemprop="image" content="b.png">
      `;
      const result = extractMetaTags(html);
      expect(result.twitter.get("card")).toBe("summary_large_image");
      expect(result.itemprop.get("image")).toBe("b.png");
    });
  });

  describe("malformed HTML", () => {
    it("recovers values from unclosed meta tags and broken markup", () => {
      const html = `
        <html><head>
          <title>Broken Page
          <meta property="og:title" content="Still Found"
          <meta property="og:description" content="Desc Found">
          <p>Body leak
        </head>
      `;
      const result = extractMetaTags(html);
      expect(result.og.get("description")).toBe("Desc Found");
    });

    it("ignores attributes that do not match the expected shape", () => {
      const html = `<meta =="og:title" content="Bad">`;
      const result = extractMetaTags(html);
      expect(result.og.has("title")).toBe(false);
    });

    it("does not throw on totally non-HTML input", () => {
      expect(() => extractMetaTags("not html at all <<<>>>")).not.toThrow();
      expect(() => extractMetaTags("{ \"json\": true }")).not.toThrow();
      const result = extractMetaTags("not html at all <<<>>>");
      expect(result.title).toBe("");
      expect(result.og.size).toBe(0);
    });

    it("handles a self-closing meta with no whitespace", () => {
      const html = `<meta property="og:title" content="Tight"/>`;
      const result = extractMetaTags(html);
      expect(result.og.get("title")).toBe("Tight");
    });

    it("trims surrounding whitespace from titles", () => {
      const html = `<title>\n   Spaced Title   \n</title>`;
      const result = extractMetaTags(html);
      expect(result.title).toBe("Spaced Title");
    });

    it("extracts only the first <title> element when multiple are present", () => {
      const html = `<title>First</title><title>Second</title>`;
      const result = extractMetaTags(html);
      expect(result.title).toBe("First");
    });

    it("returns empty string when the title tag is unclosed", () => {
      const html = `<title>Never closes`;
      const result = extractMetaTags(html);
      expect(result.title).toBe("");
    });
  });

  describe("oversized inputs", () => {
    it("only parses the first 200,000 characters", () => {
      const padding = " ".repeat(210_000);
      const earlyTag = `<meta property="og:title" content="Early">`;
      const lateTag = `<meta property="og:description" content="Late">`;
      const html = `${earlyTag}${padding}${lateTag}`;
      const result = extractMetaTags(html);
      expect(result.og.get("title")).toBe("Early");
      expect(result.og.has("description")).toBe(false);
    });

    it("does not throw when given a very large pathological input", () => {
      const big = "<meta>".repeat(50_000);
      expect(() => extractMetaTags(big)).not.toThrow();
    });

    it("processes input right at the 200,000 character boundary without truncation", () => {
      const tag = `<meta property="og:title" content="Boundary">`;
      const filler = "x".repeat(200_000 - tag.length);
      const html = `${tag}${filler}`;
      const result = extractMetaTags(html);
      expect(result.og.get("title")).toBe("Boundary");
    });
  });
});
