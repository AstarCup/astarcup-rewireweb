import { Link, useParams } from "react-router-dom";
import { parseFrontMatter, renderMarkdown } from "@/lib/markdown";
import { PageHeader } from "@/components/paper/paper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import "@/components/paper/prose.css";

const newsModules = import.meta.glob("@/data/news/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const newsDocs: { slug: string; raw: string }[] = Object.entries(newsModules).map(
  ([path, raw]) => ({
    slug: path.split("/").pop()?.replace(/\.md$/, "") ?? "",
    raw,
  }),
);

export default function NewsDetailPage() {
  const { slug } = useParams<{ slug?: string }>();
  const doc = newsDocs.find((d) => d.slug === slug);

  if (!doc) {
    return (
      <div>
        <PageHeader title="赛事资讯" />
        <div className="mx-auto max-w-2xl px-4 py-12 md:px-8">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-bold text-(--pc-ink)">文章不存在</h2>
            <p className="mt-2 text-sm text-(--pc-slate)">没有找到对应的文章，可能已被移除。</p>
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
      <PageHeader title="赛事资讯" accent="var(--pc-teal)" />
      <article className="mx-auto max-w-2xl px-4 py-10 md:px-8">
        <header className="mb-8 border-b-2 border-(--pc-border) pb-6">
          <h1 className="text-2xl font-bold leading-snug text-(--pc-ink) md:text-3xl">
            {data.title ?? "未命名文章"}
          </h1>
          {data.date && (
            <Badge variant="teal" className="mt-3">
              {data.date}
            </Badge>
          )}
        </header>
        <div className="prose-article" dangerouslySetInnerHTML={{ __html: html }} />
        <div className="mt-12 border-t-2 border-(--pc-border) pt-6">
          <Button asChild variant="outline">
            <Link to="/news">← 返回资讯列表</Link>
          </Button>
        </div>
      </article>
    </div>
  );
}