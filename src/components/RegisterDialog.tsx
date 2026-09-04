import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { fmtInt } from "@/lib/utils";
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
    if (!regAgreed) {
      setRegMsg("请先阅读并同意报名须知");
      return;
    }
    for (const f of SKILL_FIELDS) {
      if (!skills[f.key]) {
        setRegMsg(`请填写${f.label}评分`);
        return;
      }
    }
    if (!customKey.trim()) {
      setRegMsg("请填写自定义键");
      return;
    }
    if (customKeyState === "invalid") {
      setRegMsg("自定义键包含违规词，请修改");
      return;
    }
    if (!customValue || Number.isNaN(Number(customValue))) {
      setRegMsg("自定义值必须是数字");
      return;
    }
    setRegBusy(true);
    setRegMsg(null);
    const res = await api.post("/api/users", {
      osuId: user?.osuId,
      username: user?.username,
      country: user?.country ?? "",
      avatar_url: user?.avatarUrl,
      pp: user?.pp,
      global_rank: user?.globalRank,
      country_rank: user?.countryRank,
      accuracy: Number(skills.accuracy),
      stamina: Number(skills.stamina),
      firstSight: Number(skills.firstSight),
      strategy: Number(skills.strategy),
      experience: Number(skills.experience),
      customKey: customKey.trim(),
      customValue: Number(customValue),
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
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>比赛报名确认</DialogTitle>
          <DialogDescription>提交后需等待管理员审核通过。</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[65vh] gap-4 overflow-y-auto pr-1">
          {alreadyRegistered && (
            <p className="rounded-xl bg-[#5cb8a5]/10 p-3 text-sm font-bold text-[#2d2d2d]">
              当前报名状态：{REG_STATUS_LABEL[regStatus] ?? regStatus}，无需重复报名。
            </p>
          )}
          {!regEnabled && (
            <p className="rounded-xl bg-[#e85d75]/10 p-3 text-sm font-bold text-[#e85d75]">
              报名暂未开放，请关注官方公告。
            </p>
          )}
          {maxPp > 0 && !ppOk && (
            <p className="rounded-xl bg-[#e85d75]/10 p-3 text-sm font-bold text-[#e85d75]">
              你的 PP（{fmtInt(userPp)}）不在报名区间 {fmtInt(minPp)} ~ {fmtInt(maxPp)} 内，无法报名。
            </p>
          )}
          <div className="rounded-xl border-2 border-[#e0d8cc] bg-white p-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <p className="text-[#666666]">用户名：<span className="font-bold text-[#2d2d2d]">{user?.username}</span></p>
              <p className="text-[#666666]">PP：<span className="font-bold text-[#2d2d2d]">{fmtInt(userPp)}</span></p>
              <p className="text-[#666666]">全球排名：<span className="font-bold text-[#2d2d2d]">#{fmtInt(user?.globalRank)}</span></p>
              <p className="text-[#666666]">地区：<span className="font-bold text-[#2d2d2d]">{user?.country ?? "-"}</span></p>
            </div>
          </div>

          {/* 技能自评 */}
          <div className="rounded-xl border-2 border-[#e0d8cc] bg-white p-4">
            <p className="text-sm font-bold text-[#2d2d2d]">
              给你自己打个分，或者用来迷惑别人。
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {SKILL_FIELDS.map((f) => (
                <label key={f.key} className="grid gap-1">
                  <span className="text-xs text-[#666666]">{f.label}</span>
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
                    className="h-9 rounded-lg border-2 border-[#e0d8cc] bg-white px-3 text-sm text-[#2d2d2d] outline-none focus:border-[#e85d75]"
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-center">
              <RadarChart skills={radarSkills} size={230} />
            </div>
          </div>

          {/* 自定义键值对 */}
          <div className="rounded-xl border-2 border-[#e0d8cc] bg-white p-4">
            <p className="text-sm font-bold text-[#2d2d2d]">自定义键值对</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-xs text-[#666666]">自定义键</span>
                <div className="relative">
                  <input
                    type="text"
                    value={customKey}
                    onChange={(e) => handleCustomKey(e.target.value)}
                    placeholder="随便输点什么"
                    className={`h-9 w-full rounded-lg border-2 bg-white px-3 pr-8 text-sm text-[#2d2d2d] outline-none ${
                      customKeyState === "invalid"
                        ? "border-[#e85d75]"
                        : customKeyState === "valid"
                          ? "border-[#5cb8a5]"
                          : "border-[#e0d8cc]"
                    }`}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                    {customKeyState === "checking" && (
                      <span className="animate-pulse text-[#b0a898]">检</span>
                    )}
                    {customKeyState === "valid" && (
                      <span className="font-bold text-[#5cb8a5]">✓</span>
                    )}
                    {customKeyState === "invalid" && (
                      <span className="font-bold text-[#e85d75]">✗</span>
                    )}
                  </span>
                </div>
                {customKeyError && (
                  <span className="text-xs text-[#e85d75]">{customKeyError}</span>
                )}
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-[#666666]">自定义值</span>
                <input
                  type="number"
                  step="0.001"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="输入数值"
                  className="h-9 rounded-lg border-2 border-[#e0d8cc] bg-white px-3 text-sm text-[#2d2d2d] outline-none focus:border-[#e85d75]"
                />
              </label>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-[#e0d8cc] bg-white p-4">
            <input
              type="checkbox"
              checked={regAgreed}
              onChange={(e) => setRegAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#e85d75]"
            />
            <span className="text-xs leading-relaxed text-[#666666]">
              我已阅读并了解{" "}
              <Link to="/guide" className="font-bold text-[#6b7fb5] underline">
                比赛手册
              </Link>
              ，同意遵守比赛规则并确认报名信息无误。
            </span>
          </label>
          {regMsg && (
            <p className="rounded-xl bg-[#e85d75]/10 p-3 text-sm font-bold text-[#e85d75]">{regMsg}</p>
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
            disabled={regBusy || !regEnabled || (maxPp > 0 && !ppOk)}
          >
            {regBusy ? "提交中…" : "确认报名"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
