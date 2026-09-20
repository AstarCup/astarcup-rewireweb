import { useMemo, useState } from "react";
import { parseFrontMatter, renderMarkdown } from "@/lib/markdown";
import { PageHeader } from "@/components/paper/paper";
import { Button } from "@/components/ui/button";
import "@/components/paper/prose.css";

import s1 from "@/data/guide/s1.md?raw";
import s2 from "@/data/guide/s2.md?raw";

type Season = "s1" | "s2";

const guides: Record<Season, string> = { s1, s2 };
const SEASONS: Season[] = ["s1", "s2"];

export default function GuidePage() {
  // 默认加载最新一季的比赛手册
  const [season, setSeason] = useState<Season>(SEASONS[SEASONS.length - 1]);

  const doc = useMemo(() => parseFrontMatter(guides[season]), [season]);
  const html = renderMarkdown(doc.content);

  return (
    <div>
      <PageHeader title="比赛手册" subtitle="AstarCup 系列赛事的完整规则与参赛说明。" accent="#6b7fb5" />
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          {(["s1", "s2"] as const).map((se) => (
            <Button
              key={se}
              variant={season === se ? "primary" : "outline"}
              onClick={() => setSeason(se)}
            >
              {se === "s1" ? "S1" : "S2"}
            </Button>
          ))}
          <span className="text-sm text-[#b0a898]">{doc.data.title}</span>
        </div>
        <div className="prose-article" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}