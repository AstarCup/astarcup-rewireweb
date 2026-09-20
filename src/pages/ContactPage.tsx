import { PageHeader } from "@/components/paper/paper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import staffJson from "@/data/staff.json";

interface StaffMember {
  name: string;
  osuId: string;
  avatarUrl?: string;
  role: string;
  description: string;
  coverUrl?: string;
}

const staff = staffJson as unknown as StaffMember[];

const craftColors = ["#e85d75", "#5cb8a5", "#f5c040", "#6b7fb5"];

export default function ContactPage() {
  return (
    <div>
      <PageHeader title="联系我们" subtitle="AstarCup 赛事 Staff 团队风采一览。" />
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((member, i) => {
            const color = craftColors[i % craftColors.length];
            const darkText = color === "#f5c040";
            return (
              <a
                key={member.osuId}
                href={`https://osu.ppy.sh/users/${member.osuId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="flex flex-col p-6 cursor-pointer">
                  <div className="flex items-center gap-4">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      loading="lazy"
                      className="h-16 w-16 rounded-full border-2 border-(--pc-border) object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-(--pc-border) bg-(--pc-paper) font-bold text-xl text-(--pc-faint)">
                      {member.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-lg text-(--pc-ink)">{member.name}</h3>
                    <Badge
                      className={darkText ? "text-(--pc-ink)" : "text-[#fdf6ee]"}
                      style={{ backgroundColor: color, borderColor: color }}
                    >
                      {member.role}
                    </Badge>
                  </div>
                </div>
                <p className="mt-4 text-sm text-(--pc-slate)">{member.description}</p>
                </Card>
              </a>
            );
          })}
        </div>

        <Card className="mt-12 flex flex-col items-center p-10 text-center">
          <h2 className="text-2xl font-bold text-(--pc-ink)">想加入 Staff？</h2>
          <p className="mt-2 max-w-md text-sm text-(--pc-slate)">
            欢迎加入我们的 QQ 群，一起为 AstarCup 系列赛事出一份力！
          </p>
          <Button asChild variant="primary" size="lg" className="mt-6">
            <a href="https://qm.qq.com/q/sFydxoQtaw" target="_blank" rel="noopener noreferrer">
              加入招募群
            </a>
          </Button>
        </Card>
      </div>
    </div>
  );
}