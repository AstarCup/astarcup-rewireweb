/**
 * Minimal markdown + front-matter parser used for News & Guide pages.
 * Sufficient for the tournament content (headings, lists, links, bold,
 * italics, inline code, images, paragraphs, block quotes).
 */

export interface FrontMatter {
  title?: string;
  description?: string;
  date?: string;
  [key: string]: string | undefined;
}

export interface MarkdownDoc {
  data: FrontMatter;
  content: string;
}

/** Split YAML front-matter from body. */
export function parseFrontMatter(raw: string): MarkdownDoc {
  const match = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(raw);
  if (!match) return { data: {}, content: raw };
  const data: FrontMatter = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    data[key] = val;
  }
  return { data, content: raw.slice(match[0].length) };
}

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function inline(src: string): string {
  let s = escapeHtml(src);
  // images ![alt](url title)
  s = s.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_m, alt, url) => `<img src="${url}" alt="${alt || "image"}" loading="lazy" />`,
  );
  // links [text](url)
  s = s.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_m, text, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`,
  );
  // bold
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // inline code
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  // italic
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  return s;
}

/** Convert markdown to an HTML string. */
export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inCode = false;
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^```/.test(line)) {
      closeList();
      if (inCode) {
        out.push("</code></pre>");
        inCode = false;
      } else {
        inCode = true;
        out.push("<pre><code>");
      }
      continue;
    }

    if (inCode) {
      out.push(escapeHtml(line));
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      continue;
    }

    let m: RegExpMatchArray | null;
    if ((m = /^###\s+(.*)/.exec(trimmed))) {
      closeList();
      out.push(`<h3>${inline(m[1])}</h3>`);
    } else if ((m = /^##\s+(.*)/.exec(trimmed))) {
      closeList();
      out.push(`<h2>${inline(m[1])}</h2>`);
    } else if ((m = /^#\s+(.*)/.exec(trimmed))) {
      closeList();
      out.push(`<h1>${inline(m[1])}</h1>`);
    } else if (/^[-*]\s+/.test(trimmed)) {
      if (!inList) {
        inList = true;
        out.push("<ul>");
      }
      out.push(`<li>${inline(trimmed.replace(/^[-*]\s+/, ""))}</li>`);
    } else if ((m = /^>\s?(.*)/.exec(trimmed))) {
      closeList();
      out.push(`<blockquote>${inline(m[1])}</blockquote>`);
    } else if ((m = /^\|/.exec(trimmed))) {
      // naive table
      closeList();
      const cells = trimmed.split("|").filter((c) => c.trim().length > 0);
      if (/^[\s\-:]+$/.test(cells[0] || "")) continue;
      out.push(`<p>${cells.map((c) => `<code>${escapeHtml(c.trim())}</code>`).join(" ")}</p>`);
    } else {
      closeList();
      out.push(`<p>${inline(trimmed)}</p>`);
    }
  }
  closeList();
  if (inCode) out.push("</code></pre>");
  return out.join("\n");
}

/** Merge contiguous paragraphs into <p> blocks (currently each line -> <p>). */