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

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
  ensp: "\u2002",
  emsp: "\u2003",
  thinsp: "\u2009",
  zwnj: "\u200c",
  zwj: "\u200d",
  shy: "\u00ad",
  copy: "\u00a9",
  reg: "\u00ae",
  trade: "\u2122",
  hellip: "\u2026",
  mdash: "\u2014",
  ndash: "\u2013",
  lsquo: "\u2018",
  rsquo: "\u2019",
  sbquo: "\u201a",
  ldquo: "\u201c",
  rdquo: "\u201d",
  bdquo: "\u201e",
  laquo: "\u00ab",
  raquo: "\u00bb",
  lsaquo: "\u2039",
  rsaquo: "\u203a",
  bull: "\u2022",
  middot: "\u00b7",
  dagger: "\u2020",
  Dagger: "\u2021",
  permil: "\u2030",
  prime: "\u2032",
  Prime: "\u2033",
  iexcl: "\u00a1",
  iquest: "\u00bf",
  cent: "\u00a2",
  pound: "\u00a3",
  yen: "\u00a5",
  euro: "\u20ac",
  curren: "\u00a4",
  sect: "\u00a7",
  para: "\u00b6",
  deg: "\u00b0",
  plusmn: "\u00b1",
  times: "\u00d7",
  divide: "\u00f7",
  micro: "\u00b5",
  frac12: "\u00bd",
  frac14: "\u00bc",
  frac34: "\u00be",
  sup1: "\u00b9",
  sup2: "\u00b2",
  sup3: "\u00b3",
  larr: "\u2190",
  uarr: "\u2191",
  rarr: "\u2192",
  darr: "\u2193",
  harr: "\u2194",
  crarr: "\u21b5",
  not: "\u00ac",
  brvbar: "\u00a6",
  acute: "\u00b4",
  uml: "\u00a8",
  cedil: "\u00b8",
  macr: "\u00af",
  ordf: "\u00aa",
  ordm: "\u00ba",
  szlig: "\u00df",
  Auml: "\u00c4",
  Ouml: "\u00d6",
  Uuml: "\u00dc",
  auml: "\u00e4",
  ouml: "\u00f6",
  uuml: "\u00fc",
  Aring: "\u00c5",
  aring: "\u00e5",
  Aacute: "\u00c1",
  aacute: "\u00e1",
  Eacute: "\u00c9",
  eacute: "\u00e9",
  Iacute: "\u00cd",
  iacute: "\u00ed",
  Oacute: "\u00d3",
  oacute: "\u00f3",
  Uacute: "\u00da",
  uacute: "\u00fa",
  ntilde: "\u00f1",
  Ntilde: "\u00d1",
  ccedil: "\u00e7",
  Ccedil: "\u00c7",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]+);/g, (match, name) => {
      const replacement = NAMED_ENTITIES[name];
      return replacement !== undefined ? replacement : match;
    });
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
