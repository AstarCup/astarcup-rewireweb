import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { fmtInt } from "@/lib/utils";
import { site } from "@/lib/site";
import { REG_STATUS_LABEL } from "@/lib/types";
import type { ContentCheck } from "@/lib/types";
import { Button } from "@/components/ui/button";
import RadarChart from "@/components/ui/RadarChart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface RegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SKILL_FIELDS: { key: string; label: string }[] = [
  { key: "accuracy", label: "准度" },
  { key: "stamina", label: "体力" },
  { key: "firstSight", label: "初见力" },
  { key: "strategy", label: "策略" },
  { key: "experience", label: "经验" },
];

const EMPTY_SKILLS: Record<string, string> = {
  accuracy: "",
  stamina: "",
  firstSight: "",
  strategy: "",
  experience: "",
};

export default function RegisterDialog({ open, onOpenChange }: RegisterDialogProps) {
  const { user, refresh, settings } = useApp();
  const [regAgreed, setRegAgreed] = useState(false);
  const [regBusy, setRegBusy] = useState(false);
  const [regMsg, setRegMsg] = useState<string | null>(null);
  const [skills, setSkills] = useState<Record<string, string>>(EMPTY_SKILLS);
  const [customKey, setCustomKey] = useState("");
  const [customValue, setCustomValue] = useState("");
  const [customKeyState, setCustomKeyState] = useState<
    "checking" | "valid" | "invalid" | null
  >(null);
  const [customKeyError, setCustomKeyError] = useState("");
  const [bindBusy, setBindBusy] = useState(false);
  const [qq, setQq] = useState("");

  const g0v0Bound = !!user?.g0v0Bound;
  /** 只有「使用 g0v0 比赛」开启时才要求绑定 */
  const requireGv0 = String(settings?.use_gv0 ?? false) === "true";
  const handleBind = async () => {
    setBindBusy(true);
    const res = await api.get<{ authUrl: string }>("/api/bind/url");
    setBindBusy(false);
    if (res.ok && res.data.authUrl) {
      window.location.href = res.data.authUrl;
    } else {
      setRegMsg(!res.ok ? res.error.message : "未获取到授权地址，请稍后重试");
    }
  };

  const regEnabled = String(settings?.registration_enabled ?? true) !== "false";
  const regStatus = user?.registrationStatus ?? "not_registered";
  const alreadyRegistered = regStatus !== "not_registered";
  const minPp = Number(settings?.min_pp_for_registration ?? 0);
  const maxPp = Number(settings?.max_pp_for_registration ?? 0);
  const userPp = Number(user?.pp) || 0;
  const ppOk = userPp >= minPp && userPp <= maxPp;

  const radarSkills = SKILL_FIELDS.map((f) => ({
    label: f.label,
    value: Number(skills[f.key]) || 0,
  })).concat(
    customKey.trim() && customValue
      ? [{ label: customKey.trim(), value: Number(customValue) || 0 }]
      : [],
  );

  const checkCustomKey = async (value: string) => {
    if (!value.trim()) {
      setCustomKeyState(null);
      setCustomKeyError("");
      return;
    }
    setCustomKeyState("checking");
    setCustomKeyError("");
    const res = await api.post<ContentCheck>("/api/content/check", { text: value.trim() });
    if (res.ok && res.data.hasIllegal) {
      setCustomKeyState("invalid");
      setCustomKeyError("包含违规词，请修改");
    } else {
      setCustomKeyState("valid");
      setCustomKeyError("");
    }
  };

  const handleCustomKey = (value: string) => {
    setCustomKey(value);
    void checkCustomKey(value);
  };

  const submitRegistration = async () => {
    if (requireGv0 && !g0v0Bound) {
      setRegMsg("请先绑定 g0v0 服务器账号后再报名");
      return;
    }
    if (!regAgreed) {
      setRegMsg("请先阅读并同意报名须知");
      return;
    }
    if (!qq.trim()) {
      setRegMsg("请填写 QQ 号");
      return;
    }
    // 技能评分与自定义键值均为选填；填了自定义键才做违规词校验
    if (customKey.trim() && customKeyState === "invalid") {
      setRegMsg("自定义键包含违规词，请修改");
      return;
    }
    if (customValue && Number.isNaN(Number(customValue))) {
      setRegMsg("自定义值必须是数字");
      return;
    }
    setRegBusy(true);
    setRegMsg(null);
    const toNum = (s: string) => (s.trim() === "" ? null : Number(s));
    const res = await api.post("/api/users", {
      osuId: user?.osuId,
      username: user?.username,
      country: user?.country ?? "",
      avatar_url: user?.avatarUrl,
      pp: user?.pp,
      global_rank: user?.globalRank,
      country_rank: user?.countryRank,
      accuracy: toNum(skills.accuracy),
      stamina: toNum(skills.stamina),
      firstSight: toNum(skills.firstSight),
      strategy: toNum(skills.strategy),
      experience: toNum(skills.experience),
      customKey: customKey.trim() || null,
      customValue: customValue.trim() === "" ? null : Number(customValue),
      qq: qq.trim() || null,
    });
    setRegBusy(false);
    if (res.ok) {
      onOpenChange(false);
      setRegAgreed(false);
      setSkills(EMPTY_SKILLS);
      setCustomKey("");
      setCustomValue("");
      setCustomKeyState(null);
      setCustomKeyError("");
      setQq("");
      setRegMsg(null);
      await refresh();
    } else {
      setRegMsg(res.error.message);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setRegAgreed(false);
          setRegMsg(null);
          setSkills(EMPTY_SKILLS);
          setCustomKey("");
          setCustomValue("");
          setCustomKeyState(null);
          setCustomKeyError("");
          setQq("");
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>比赛报名确认</DialogTitle>
          <DialogDescription>提交后需等待管理员审核通过。</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[65vh] gap-4 overflow-y-auto pr-1">
          {alreadyRegistered && (
            <p className="rounded-xl bg-pc-teal/10 p-3 text-sm font-bold text-(--pc-ink)">
              当前报名状态：{REG_STATUS_LABEL[regStatus] ?? regStatus}，无需重复报名。
            </p>
          )}
          {!regEnabled && (
            <p className="rounded-xl bg-pc-primary/10 p-3 text-sm font-bold text-pc-primary">
              报名暂未开放，请关注官方公告。
            </p>
          )}
          {maxPp > 0 && !ppOk && (
            <p className="rounded-xl bg-pc-primary/10 p-3 text-sm font-bold text-pc-primary">
              你的 PP（{fmtInt(userPp)}）不在报名区间 {fmtInt(minPp)} ~ {fmtInt(maxPp)} 内，无法报名。
            </p>
          )}
          {requireGv0 && !g0v0Bound && (
            <div className="rounded-xl border-2 border-pc-yellow bg-pc-yellow/10 p-4">
              <p className="text-sm font-bold text-(--pc-ink)">
                尚未绑定 g0v0 服务器账号
              </p>
              <p className="mt-1 text-xs text-(--pc-slate)">
                报名比赛前需先绑定 g0v0 私服账号，绑定后才能提交报名。
              </p>
              <Button
                variant="yellow"
                size="sm"
                className="mt-3"
                onClick={() => void handleBind()}
                disabled={bindBusy}
              >
                {bindBusy ? "跳转中…" : "去绑定 g0v0 账号"}
              </Button>
            </div>
          )}
          <div className="rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <p className="text-(--pc-slate)">用户名：<span className="font-bold text-(--pc-ink)">{user?.username}</span></p>
              <p className="text-(--pc-slate)">PP：<span className="font-bold text-(--pc-ink)">{fmtInt(userPp)}</span></p>
              <p className="text-(--pc-slate)">全球排名：<span className="font-bold text-(--pc-ink)">#{fmtInt(user?.globalRank)}</span></p>
              <p className="text-(--pc-slate)">地区：<span className="font-bold text-(--pc-ink)">{user?.country ?? "-"}</span></p>
            </div>
          </div>

          {/* 技能自评：左边输入，右边雷达图 */}
          <div className="rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-4">
            <p className="text-sm font-bold text-(--pc-ink)">
              技能自评（选填）：给你自己打个分，或者用来迷惑别人。
            </p>
            <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1fr)_250px] md:items-center">
              <div className="grid grid-cols-2 gap-3">
                {SKILL_FIELDS.map((f) => (
                  <label key={f.key} className="grid gap-1">
                    <span className="text-xs text-(--pc-slate)">{f.label}</span>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={skills[f.key]}
                      onChange={(e) =>
                        setSkills((prev) => ({ ...prev, [f.key]: e.target.value }))
                      }
                      placeholder="0-10"
                      className="h-9 rounded-lg border-2 border-(--pc-border) bg-(--pc-white) px-3 text-sm text-(--pc-ink) outline-none focus:border-pc-primary"
                    />
                  </label>
                ))}
              </div>
              <div className="flex justify-center">
                <RadarChart skills={radarSkills} size={230} />
              </div>
            </div>
          </div>

          {/* 自定义键值对 */}
          <div className="rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-4">
            <p className="text-sm font-bold text-(--pc-ink)">自定义键值对</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-xs text-(--pc-slate)">自定义键</span>
                <div className="relative">
                  <input
                    type="text"
                    value={customKey}
                    onChange={(e) => handleCustomKey(e.target.value)}
                    placeholder="随便输点什么"
                    className={`h-9 w-full rounded-lg border-2 bg-(--pc-white) px-3 pr-8 text-sm text-(--pc-ink) outline-none ${customKeyState === "invalid"
                        ? "border-pc-primary"
                        : customKeyState === "valid"
                          ? "border-pc-teal"
                          : "border-(--pc-border)"
                      }`}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                    {customKeyState === "checking" && (
                      <span className="animate-pulse text-(--pc-faint)">检</span>
                    )}
                    {customKeyState === "valid" && (
                      <span className="font-bold text-pc-teal">✓</span>
                    )}
                    {customKeyState === "invalid" && (
                      <span className="font-bold text-pc-primary">✗</span>
                    )}
                  </span>
                </div>
                {customKeyError && (
                  <span className="text-xs text-pc-primary">{customKeyError}</span>
                )}
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-(--pc-slate)">自定义值</span>
                <input
                  type="number"
                  step="0.001"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="输入数值"
                  className="h-9 rounded-lg border-2 border-(--pc-border) bg-(--pc-white) px-3 text-sm text-(--pc-ink) outline-none focus:border-pc-primary"
                />
              </label>
            </div>
          </div>

          {/* QQ 联系方式（必填） */}
          <div className="rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-4">
            <p className="text-sm font-bold text-(--pc-ink)">QQ 号（必填）</p>
            <p className="mt-0.5 text-xs text-(--pc-faint)">
              方便staff与你联系（还请记得加QQ群:<a href={site.contact.qqGroup} target="_blank" rel="noopener noreferrer">{site.contact.qqGroupNumber}</a>）。
            </p>
            <input
              type="text"
              value={qq}
              onChange={(e) => setQq(e.target.value)}
              placeholder="请输入 QQ 号"
              className="mt-3 h-9 w-full rounded-lg border-2 border-(--pc-border) bg-(--pc-white) px-3 text-sm text-(--pc-ink) outline-none focus:border-pc-primary"
            />
            {!qq.trim() && (
              <p className="mt-1 text-xs text-pc-primary">报名需填写 QQ 号</p>
            )}
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-4">
            <input
              type="checkbox"
              checked={regAgreed}
              onChange={(e) => setRegAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-pc-primary"
            />
            <span className="text-xs leading-relaxed text-(--pc-slate)">
              我已阅读并了解{" "}
              <Link to="/guide" className="font-bold text-pc-blue underline">
                比赛手册
              </Link>
              ，同意遵守比赛规则并确认报名信息无误。
            </span>
          </label>
          {regMsg && (
            <p className="rounded-xl bg-pc-primary/10 p-3 text-sm font-bold text-pc-primary">{regMsg}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={regBusy}
          >
            取消
          </Button>
          <Button
            variant="primary"
            onClick={() => void submitRegistration()}
            disabled={
              regBusy ||
              !regEnabled ||
              (maxPp > 0 && !ppOk) ||
              (requireGv0 && !g0v0Bound) ||
              !qq.trim()
            }
          >
            {regBusy ? "提交中…" : "确认报名"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
