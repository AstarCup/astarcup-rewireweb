import { Link } from "react-router-dom";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/paper/paper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFetch, LoadingBlock, ErrorBlock } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import type { NewsItem } from "@/lib/types";

export default function NewsPage() {
  const { data, loading, error, refetch } = useFetch<NewsItem[]>(() =>
    api.get("/api/news"),
  );
  const newsItems = data ?? [];

  return (
    <div>
      <PageHeader title="赛事资讯" subtitle="AstarCup 系列赛事的最新动态与官方公告。" />
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
        {loading && <LoadingBlock label="加载资讯中…" />}
        {error && !loading && <ErrorBlock message={error} onRetry={() => void refetch()} />}
        {!loading && !error && newsItems.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-sm text-(--pc-slate)">暂无资讯，稍后再来看看。</p>
          </Card>
        )}
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
