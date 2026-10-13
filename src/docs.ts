// Docs tools that need no key. They read the public docs on betterfans.link and
// match the hosted server's search_docs and get_doc, so an agent sees the same
// inputs, outputs and bfl://docs/ URIs with or without a key.

export const VERSION = "2.0.0";

export const SITE_URL = (process.env.BFL_SITE_URL || "https://betterfans.link").replace(/\/+$/, "");

export type DocPage = {
  slug: string;
  title: string;
  description: string;
  url: string;
  headings: string[];
};

export function docUri(slug: string): string {
  return `bfl://docs/${slug}`;
}

const INDEX_TTL_MS = 10 * 60 * 1000;
let cached: { at: number; pages: DocPage[] } | undefined;

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": `betterfans-mcp/${VERSION}` } });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res.text();
}

export async function docPages(): Promise<DocPage[]> {
  if (cached && Date.now() - cached.at < INDEX_TTL_MS) return cached.pages;
  const body = JSON.parse(await fetchText(`${SITE_URL}/docs-index.json`)) as { pages: DocPage[] };
  cached = { at: Date.now(), pages: body.pages };
  return body.pages;
}

/** A slug, a betterfans.link docs URL or a bfl://docs/ URI, as a slug. Undefined when it is none of those. */
export function normalizeSlug(input: string): string | undefined {
  let s = input.trim();
  s = s.replace(/^bfl:\/\/docs\/?/, "");
  s = s.replace(/^https?:\/\/[^/]+/, "");
  s = s.replace(/^\/?llms\.mdx\/?/, "").replace(/^\/?docs\/?/, "");
  s = s.split(/[?#]/)[0].replace(/^\/+|\/+$/g, "");
  if (s === "") return "index";
  return /^[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(s) ? s : undefined;
}

/** Ranks pages by how many query words appear in the title, description and headings. */
export function searchDocs(pages: DocPage[], query: string, limit: number): DocPage[] {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1);
  if (words.length === 0) return [];
  const scored = pages.map((p) => {
    const title = p.title.toLowerCase();
    const desc = p.description.toLowerCase();
    const heads = p.headings.join(" ").toLowerCase();
    let score = 0;
    for (const w of words) {
      if (title.includes(w)) score += 3;
      if (p.slug.includes(w)) score += 2;
      if (desc.includes(w)) score += 2;
      if (heads.includes(w)) score += 1;
    }
    return { p, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.p);
}

export async function readDoc(slug: string): Promise<{ slug: string; title: string; url: string; markdown: string } | undefined> {
  const res = await fetch(`${SITE_URL}/llms.mdx/${slug}`, { headers: { "user-agent": `betterfans-mcp/${VERSION}` } });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`${SITE_URL}/llms.mdx/${slug} answered ${res.status}`);
  const markdown = await res.text();
  const page = (await docPages()).find((p) => p.slug === slug);
  return {
    slug,
    title: page?.title ?? slug,
    url: page?.url ?? `${SITE_URL}/docs${slug === "index" ? "" : `/${slug}`}`,
    markdown,
  };
}

export function readIndex(): Promise<string> {
  return fetchText(`${SITE_URL}/llms.txt`);
}

export function readFull(): Promise<string> {
  return fetchText(`${SITE_URL}/llms-full.txt`);
}

export function readAgentSetup(): Promise<string> {
  return fetchText(`${SITE_URL}/agent-setup`);
}
