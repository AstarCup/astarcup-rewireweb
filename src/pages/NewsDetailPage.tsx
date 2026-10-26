import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { renderMarkdown } from "@/lib/markdown";
import { PageHeader } from "@/components/paper/paper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingBlock } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import type { NewsDetail } from "@/lib/types";
import "@/components/paper/prose.css";

interface DetailState {
  data: NewsDetail | null;
  loading: boolean;
  error: string | null;
}

export default function NewsDetailPage() {
  const { slug } = useParams<{ slug?: string }>();
  const [state, setState] = useState<DetailState>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, loading: true, error: null });
    void api
      .get<NewsDetail>(`/api/news/${encodeURIComponent(slug ?? "")}`)
      .then((res) => {
        if (cancelled) return;
        if (res.ok) setState({ data: res.data, loading: false, error: null });
        else setState({ data: null, loading: false, error: res.error.message });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.loading) {
    return (
      <div>
        <PageHeader title="赛事资讯" accent="#5cb8a5" />
        <LoadingBlock label="加载资讯中…" />
      </div>
    );
  }

  const item = state.data;
  if (!item) {
    return (
      <div>
        <PageHeader title="赛事资讯" />
        <div className="mx-auto max-w-2xl px-4 py-12 md:px-8">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-bold text-(--pc-ink)">文章不存在</h2>
            <p className="mt-2 text-sm text-(--pc-slate)">
              {state.error || "没有找到对应的文章，可能已被移除。"}
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/news">← 返回资讯列表</Link>
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const html = renderMarkdown(item.content);

  return (
    <div>
      <PageHeader title="赛事资讯" accent="#5cb8a5" />
      <article className="mx-auto max-w-2xl px-4 py-10 md:px-8">
        <header className="mb-8 border-b-2 border-(--pc-border) pb-6">
          <h1 className="text-2xl font-bold leading-snug text-(--pc-ink) md:text-3xl">
            {item.title || "未命名文章"}
          </h1>
          {item.date && (
            <Badge variant="teal" className="mt-3">
              {item.date}
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
