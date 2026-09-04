import { Link, useParams } from "react-router-dom";
import { parseFrontMatter, renderMarkdown } from "@/lib/markdown";
import { PageHeader } from "@/components/paper/paper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import "@/components/paper/prose.css";

import m1 from "@/data/news/1.md?raw";
import m2 from "@/data/news/2.md?raw";
import m3 from "@/data/news/3.md?raw";
import m4 from "@/data/news/4.md?raw";

const newsDocs: { slug: string; raw: string }[] = [
  { slug: "1", raw: m1 },
  { slug: "2", raw: m2 },
  { slug: "3", raw: m3 },
  { slug: "4", raw: m4 },
];

export default function NewsDetailPage() {
  const { slug } = useParams<{ slug?: string }>();
  const doc = newsDocs.find((d) => d.slug === slug);

  if (!doc) {
    return (
      <div>
        <PageHeader title="赛事资讯" />
        <div className="mx-auto max-w-2xl px-4 py-12 md:px-8">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-bold text-[#2d2d2d]">文章不存在</h2>
            <p className="mt-2 text-sm text-[#666666]">没有找到对应的文章，可能已被移除。</p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/news">← 返回资讯列表</Link>
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const { data, content } = parseFrontMatter(doc.raw);
  const html = renderMarkdown(content);

  return (
    <div>
      <PageHeader title="赛事资讯" accent="#5cb8a5" />
      <article className="mx-auto max-w-2xl px-4 py-10 md:px-8">
        <header className="mb-8 border-b-2 border-[#e0d8cc] pb-6">
          <h1 className="text-2xl font-bold leading-snug text-[#2d2d2d] md:text-3xl">
            {data.title ?? "未命名文章"}
          </h1>
          {data.date && (
            <Badge variant="teal" className="mt-3">
              {data.date}
            </Badge>
          )}
        </header>
        <div className="prose-article" dangerouslySetInnerHTML={{ __html: html }} />
        <div className="mt-12 border-t-2 border-[#e0d8cc] pt-6">
          <Button asChild variant="outline">
            <Link to="/news">← 返回资讯列表</Link>
          </Button>
        </div>
      </article>
    </div>
  );
}