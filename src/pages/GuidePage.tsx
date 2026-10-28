import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { parseFrontMatter, renderMarkdown } from "@/lib/markdown";
import type { SeasonRule } from "@/lib/types";
import { PageHeader } from "@/components/paper/paper";
import { Button } from "@/components/ui/button";
import "@/components/paper/prose.css";

// 内置兜底：管理后台还没写入的赛季用 src/data/guide/{赛季}.md
const guidesRaw = import.meta.glob("@/data/guide/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const bundled: Record<string, string> = Object.fromEntries(
  Object.entries(guidesRaw).map(([path, raw]) => [
    path.split("/").pop()?.replace(/\.md$/, "") ?? "",
    raw,
  ]),
);

/** 优先取 front matter 的 title，其次是正文第一个一级标题 */
function pickTitle(raw: string, season: string): string {
  const doc = parseFrontMatter(raw);
  if (doc.data.title) return doc.data.title;
  const h1 = /^#\s+(.+)$/m.exec(doc.content)?.[1]?.trim();
  return h1 || `AstarCup ${season.toUpperCase()} 比赛手册`;
}

export default function GuidePage() {
  // 管理后台「内容管理 → 赛季规则」写入 season_rules 表，这里是同一份数据
  const [remote, setRemote] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    void api.get<SeasonRule[]>("/api/rules").then((res) => {
      if (cancelled || !res.ok) return;
      setRemote(
        Object.fromEntries(
          res.data
            .filter((r) => r.season && r.content?.trim())
            .map((r) => [r.season.toLowerCase(), r.content]),
        ),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const docs = useMemo(() => ({ ...bundled, ...remote }), [remote]);
  const seasons = useMemo(
    () => Object.keys(docs).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [docs],
  );
  // 默认展示最新一季；选中项失效时也回落到最新
  const season = selected && docs[selected] ? selected : (seasons[seasons.length - 1] ?? "");

  const raw = docs[season] ?? "";
  const doc = useMemo(() => parseFrontMatter(raw), [raw]);
  const html = renderMarkdown(doc.content);

  return (
    <div>
      <PageHeader title="比赛手册" subtitle="AstarCup 系列赛事的完整规则与参赛说明。" accent="var(--pc-blue)" />
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          {seasons.map((se) => (
            <Button
              key={se}
              variant={season === se ? "primary" : "outline"}
              onClick={() => setSelected(se)}
            >
              {se.toUpperCase()}
            </Button>
          ))}
          <span className="text-sm text-(--pc-faint)">{raw ? pickTitle(raw, season) : ""}</span>
        </div>
        <div className="prose-article" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
