import { useEffect, useState } from "react";
import { useFetch, LoadingBlock, ErrorBlock } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import { SectionTitle } from "@/components/paper/paper";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { Settings } from "@/lib/types";

interface FormState {
  tournament_name: string;
  current_season: string;
  current_season_stage: string;
  min_pp_for_registration: string;
  max_pp_for_registration: string;
}

const TEXT_FIELDS: { key: keyof FormState; label: string }[] = [
  { key: "tournament_name", label: "赛事名称" },
  { key: "current_season", label: "当前赛季" },
  { key: "current_season_stage", label: "当前阶段" },
  { key: "min_pp_for_registration", label: "报名最低 PP" },
  { key: "max_pp_for_registration", label: "报名最高 PP" },
];

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

export default function SettingsManagement() {
  const { data, loading, error, load } = useFetch<Settings>(() => api.get("/api/settings"));
  const [form, setForm] = useState<FormState>({
    tournament_name: "",
    current_season: "",
    current_season_stage: "",
    min_pp_for_registration: "",
    max_pp_for_registration: "",
  });
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [mappoolVisible, setMappoolVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!data) return;
    setForm({
      tournament_name: str(data.tournament_name),
      current_season: str(data.current_season),
      current_season_stage: str(data.current_season_stage),
      min_pp_for_registration: str(data.min_pp_for_registration),
      max_pp_for_registration: str(data.max_pp_for_registration),
    });
    setRegistrationEnabled((data.registration_enabled ?? "true") !== "false");
    setMappoolVisible((data.mappool_visible ?? "true") !== "false");
  }, [data]);

  const setField =
    (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    setMsg("");
    const body = {
      tournament_name: form.tournament_name,
      current_season: form.current_season,
      current_season_stage: form.current_season_stage,
      min_pp_for_registration: form.min_pp_for_registration,
      max_pp_for_registration: form.max_pp_for_registration,
      registration_enabled: String(registrationEnabled),
      mappool_visible: String(mappoolVisible),
    };
    const res = await api.post<Settings>("/api/settings", body, { method: "PUT" });
    setBusy(false);
    if (res.ok) {
      setMsg("设置已保存");
      void load();
    } else {
      setMsg("保存失败");
    }
  };

  if (loading) return <LoadingBlock label="加载设置中…" />;
  if (error || !data)
    return <ErrorBlock message={error || "没有数据"} onRetry={load} />;

  return (
    <div>
      <SectionTitle tag="系统设置" accent="#e85d75">
        赛事设置
      </SectionTitle>

      {msg && (
        <Badge variant={msg.includes("失败") ? "primary" : "teal"} className="mb-4">
          {msg}
        </Badge>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {TEXT_FIELDS.map((f) => (
              <div key={f.key} className="grid gap-1.5">
                <Label>{f.label}</Label>
                <Input value={form[f.key]} onChange={setField(f.key)} />
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-between rounded-xl border-2 border-[#e0d8cc] bg-white p-4">
              <div>
                <p className="font-bold text-[#2d2d2d]">开放报名</p>
                <p className="text-xs text-[#b0a898]">允许新玩家报名</p>
              </div>
              <input
                type="checkbox"
                checked={registrationEnabled}
                onChange={(e) => setRegistrationEnabled(e.target.checked)}
                className="h-5 w-5 accent-[#e85d75]"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between rounded-xl border-2 border-[#e0d8cc] bg-white p-4">
              <div>
                <p className="font-bold text-[#2d2d2d]">图池可见</p>
                <p className="text-xs text-[#b0a898]">向玩家展示图池</p>
              </div>
              <input
                type="checkbox"
                checked={mappoolVisible}
                onChange={(e) => setMappoolVisible(e.target.checked)}
                className="h-5 w-5 accent-[#6b7fb5]"
              />
            </label>
          </div>

          <Separator className="my-6" />

          {data.availableSeasons && data.availableSeasons.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-bold text-[#2d2d2d]">可用赛季</p>
              <div className="flex flex-wrap gap-2">
                {data.availableSeasons.map((s) => (
                  <Badge key={s.value} variant="outline">
                    {s.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button variant="primary" onClick={save} disabled={busy}>
              {busy ? "保存中…" : "保存设置"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}