export interface ExtractedMetaTags {
  title: string;
  og: Map<string, string>;
  twitter: Map<string, string>;
  meta: Map<string, string>;
  itemprop: Map<string, string>;
}

const META_TAG_RE = /<meta\b([^>]*?)\/?>/gi;
const ATTR_RE = /(\w[\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
const TITLE_RE = /<title[^>]*>([\s\S]*?)<\/title>/i;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)));
}

function parseAttrs(attrStr: string): Record<string, string> {
  const out: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(attrStr)) !== null) {
    const key = m[1].toLowerCase();
    const val = m[2] ?? m[3] ?? m[4] ?? "";
    out[key] = decodeEntities(val);
  }
  return out;
}

export function extractMetaTags(html: string): ExtractedMetaTags {
  const og = new Map<string, string>();
  const twitter = new Map<string, string>();
  const meta = new Map<string, string>();
  const itemprop = new Map<string, string>();

  // Limit work on huge pages.
  const head = html.length > 200_000 ? html.slice(0, 200_000) : html;

  META_TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = META_TAG_RE.exec(head)) !== null) {
    const attrs = parseAttrs(match[1]);
    const content = attrs["content"];
    if (!content) continue;

    const property = attrs["property"];
    const name = attrs["name"];
    const ip = attrs["itemprop"];

    if (property?.startsWith("og:")) {
      og.set(property.slice(3), content);
    } else if (name?.startsWith("og:")) {
      og.set(name.slice(3), content);
    } else if (name?.startsWith("twitter:")) {
      twitter.set(name.slice(8), content);
    } else if (property?.startsWith("article:")) {
      og.set(property, content);
    }

    if (name && !name.includes(":")) meta.set(name, content);
    if (ip) itemprop.set(ip, content);
  }

  const titleMatch = head.match(TITLE_RE);
  const title = titleMatch ? decodeEntities(titleMatch[1]).trim() : "";

  return { title, og, twitter, meta, itemprop };
}
