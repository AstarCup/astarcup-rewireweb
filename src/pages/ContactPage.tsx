import { PageHeader, EmptyState } from "@/components/paper/paper";
import { ErrorBlock, LoadingBlock } from "@/components/paper/feedback";
import UserAvatar from "@/components/UserAvatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { site } from "@/lib/site";

interface StaffMember {
  id: number;
  osuId: string;
  name: string;
  avatarUrl: string;
  coverUrl: string;
  category: string;
  position: string;
  sortOrder: number;
}

export default function ContactPage() {
  const { data, loading, error, refetch } = useFetch(() =>
    api.get<{ staff: StaffMember[] }>("/api/staff"),
  );
  const staff = data?.staff ?? [];

  return (
    <div>
      <PageHeader title="联系我们" />
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        {loading && <LoadingBlock label="加载成员…" />}
        {error && !loading && <ErrorBlock message={error} onRetry={() => void refetch()} />}
        {!loading && !error && staff.length === 0 && <EmptyState label="暂无成员" />}
        {!loading && !error && staff.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {staff.map((member) => {
              const name = member.name || member.osuId;
              const chips = member.category.split(/\s+/).filter(Boolean);
              return (
                <a
                  key={member.id}
                  href={site.urls.osuUser(member.osuId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block h-full"
                >
                  {/* 与选手报名卡片同步的布局：封面横幅 + 悬挂头像 + 名字/副标题 + 底部行 */}
                  <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-(--pc-white) text-left shadow-[4px_4px_0px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,0.12)]">
                    <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-pc-teal/40 to-pc-blue/40">
                      {member.coverUrl && (
                        <img
                          src={member.coverUrl}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                        />
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/10" />
                      {chips.length > 0 && (
                        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
                          {chips.map((chip) => (
                            <span
                              key={chip}
                              className="flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm"
                            >
                              {chip}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative flex flex-1 flex-col px-3 pb-3 pt-2">
                      <UserAvatar
                        username={name}
                        avatarUrl={member.avatarUrl}
                        osuId={member.osuId}
                        className="absolute -top-8 right-3 h-16 w-16 rounded-xl border-4 border-(--pc-white) bg-(--pc-paper) shadow-[2px_2px_0px_rgba(0,0,0,0.08)]"
                        fallbackClassName="bg-pc-yellow/30 text-base font-bold text-(--pc-ink)"
                        uppercase
                      />
                      <div className="min-w-0 pr-20">
                        <p className="truncate text-[15px] font-bold leading-tight text-(--pc-ink)">
                          {name}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-(--pc-faint)">
                          {member.position}
                        </p>
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        <Card className="mt-12 flex flex-col items-center p-10 text-center">
          <h2 className="text-2xl font-bold text-(--pc-ink)">想加入 Staff？</h2>
          <Button asChild variant="primary" size="lg" className="mt-6">
            <a href={site.contact.qqGroup} target="_blank" rel="noopener noreferrer">
              加入招募群
            </a>
          </Button>
        </Card>
      </div>
    </div>
  );
}
