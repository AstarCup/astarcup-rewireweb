import { useMemo, useState } from "react";
import { parseFrontMatter, renderMarkdown } from "@/lib/markdown";
import { PageHeader } from "@/components/paper/paper";
import { Button } from "@/components/ui/button";
import "@/components/paper/prose.css";

// 手册文件按 `src/data/guide/{赛季}.md` 约定命名，赛季列表由此自动生成
const guidesRaw = import.meta.glob("@/data/guide/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const guides: Record<string, string> = Object.fromEntries(
  Object.entries(guidesRaw).map(([path, raw]) => [
    path.split("/").pop()?.replace(/\.md$/, "") ?? "",
    raw,
  ]),
);
const SEASONS: string[] = Object.keys(guides).sort((a, b) =>
  a.localeCompare(b, undefined, { numeric: true }),
);

export default function GuidePage() {
  // 默认加载最新一季的比赛手册
  const [season, setSeason] = useState<string>(SEASONS[SEASONS.length - 1] ?? "");

  const doc = useMemo(() => parseFrontMatter(guides[season] ?? ""), [season]);
  const html = renderMarkdown(doc.content);

  return (
    <div>
      <PageHeader title="比赛手册" subtitle="AstarCup 系列赛事的完整规则与参赛说明。" accent="var(--pc-blue)" />
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          {SEASONS.map((se) => (
            <Button
              key={se}
              variant={season === se ? "primary" : "outline"}
              onClick={() => setSeason(se)}
            >
              {se.toUpperCase()}
            </Button>
          ))}
          <span className="text-sm text-(--pc-faint)">{doc.data.title}</span>
        </div>
        <div className="prose-article" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}