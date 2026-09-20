import { Link } from "react-router-dom";
import { formatDate } from "@/lib/utils";
import { parseFrontMatter } from "@/lib/markdown";
import { PageHeader } from "@/components/paper/paper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface NewsItem {
  slug: string;
  title: string;
  date: string;
  description: string;
}

const newsModules = import.meta.glob("@/data/news/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const newsItems: NewsItem[] = Object.entries(newsModules)
  .map(([path, raw]) => {
    const slug = path.split("/").pop()?.replace(/\.md$/, "") ?? "";
    const { data } = parseFrontMatter(raw);
    return {
      slug,
      title: data.title ?? "未命名",
      date: data.date ?? "",
      description: data.description ?? "",
    };
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1));

export default function NewsPage() {
  return (
    <div>
      <PageHeader title="赛事资讯" subtitle="AstarCup 系列赛事的最新动态与官方公告。" />
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
        <div className="space-y-5">
          {newsItems.map((item) => (
            <Link key={item.slug} to={`/news/${item.slug}`} className="block">
              <Card className="p-6">
                <Badge variant="yellow" className="mb-3">
                  {item.date ? formatDate(item.date) : "即将发布"}
                </Badge>
                <h2 className="font-bold text-xl text-(--pc-ink)">{item.title}</h2>
                <p className="mt-2 text-sm text-(--pc-slate)">{item.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#e85d75]">
                  阅读全文 →
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}