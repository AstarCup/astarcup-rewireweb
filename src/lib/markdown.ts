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

/** 仅放行安全 scheme，阻断 javascript:/data: 等链接注入。 */
function safeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^(https?:|mailto:|\/|\.\/|\.\.\/|#)/i.test(trimmed)) return trimmed;
  return "#";
}

function inline(src: string): string {
  let s = escapeHtml(src);
  // images ![alt](url title)
  s = s.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_m, alt, url) => `<img src="${safeUrl(url)}" alt="${alt || "image"}" loading="lazy" />`,
  );
  // links [text](url)
  s = s.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_m, text, url) =>
      `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`,
  );
  // bold
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // strikethrough（赛季规则里常用 ~~旧内容~~ 标记已失效内容）
  s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
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
    if ((m = /^(#{1,6})\s+(.*)/.exec(trimmed))) {
      closeList();
      const level = m[1].length;
      out.push(`<h${level}>${inline(m[2])}</h${level}>`);
    } else if (/^[-*]\s+/.test(trimmed)) {
      if (!inList) {
        inList = true;
        out.push("<ul>");
      }
      out.push(`<li>${inline(trimmed.replace(/^[-*]\s+/, ""))}</li>`);
    } else if ((m = /^>\s?(.*)/.exec(trimmed))) {
      closeList();
      out.push(`<blockquote>${inline(m[1])}</blockquote>`);
    } else if ((m = /^\s*\|/.exec(line))) {
      // GFM 表格：连续收集 | 行，第二行为分隔行时去掉
      closeList();
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        const l = lines[i];
        const cells = l
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());
        rows.push(cells);
        i++;
      }
      i--;
      if (rows.length === 0) continue;
      let body = rows.slice(1);
      const isSep = (r: string[]) =>
        r.length > 0 && r.every((c) => /^:?-{1,}:?$/.test(c));
      if (body.length > 0 && isSep(body[0])) body = body.slice(1);
      out.push("<table>");
      out.push(
        `<thead><tr>${rows[0]
          .map((c) => `<th>${inline(c)}</th>`)
          .join("")}</tr></thead>`,
      );
      out.push(
        `<tbody>${body
          .map(
            (r) =>
              `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`,
          )
          .join("")}</tbody>`,
      );
      out.push("</table>");
    } else {
      closeList();
      out.push(`<p>${inline(trimmed)}</p>`);
    }
  }
  closeList();
  if (inCode) out.push("</code></pre>");
  return out.join("\n");
}