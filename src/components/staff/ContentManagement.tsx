import { useState } from "react";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useFetch, LoadingBlock, ErrorBlock } from "@/hooks/useFetch";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { SectionTitle } from "@/components/paper/paper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MarkdownEditor from "@/components/staff/MarkdownEditor";
import { cn, formatDateTime } from "@/lib/utils";
import type { NewsDetail, NewsInput, NewsItem, SeasonRule } from "@/lib/types";

const EMPTY_FORM: NewsInput = {
  slug: "",
  title: "",
  description: "",
  date: "",
  content: "",
  published: true,
};

/** 本机日期 YYYY-MM-DD（新建资讯时写入隐藏的 date 字段） */
function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 标题 → slug；纯中文标题没有 ASCII 字符时退回 news-日期 */
function slugFromTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return base || `news-${todayLocal()}`;
}

/** 全屏弹窗：覆盖 DialogContent 默认的居中小卡片样式。
 * 必须带 flex-col：底层 DialogContent 是 flex，缺少方向时会把
 * 头/正文/尾并排成三列。 */
const FULLSCREEN =
  "fixed inset-0 left-0 top-0 z-50 flex flex-col h-screen w-screen max-w-none translate-x-0 " +
  "translate-y-0 rotate-0 rounded-none border-0 p-0 gap-0 shadow-none";

/** 弹窗头/尾的通用样式（避开右上角关闭按钮） */
const DIALOG_HEAD =
  "shrink-0 border-b-2 border-(--pc-border) px-6 py-4 pr-14";
/** 资讯弹窗头：标题在左，保存按钮在右，右上角留给关闭按钮 */
const DIALOG_HEAD_BAR =
  "shrink-0 flex items-start justify-between gap-4 border-b-2 border-(--pc-border) px-6 py-4 pr-16";
const DIALOG_BODY = "min-h-0 flex-1 overflow-y-auto px-6 py-5";
const DIALOG_FOOT = "shrink-0 border-t-2 border-(--pc-border) px-6 py-4";

interface RuleDialogState {
  open: boolean;
  season: string;
  content: string;
  isNew: boolean;
}

const RULE_DIALOG_CLOSED: RuleDialogState = {
  open: false,
  season: "",
  content: "",
  isNew: false,
};

/**
 * 内容管理：资讯（news 表）的增删改查 + 赛季规则（season_rules 表）编辑。
 * 两者都用全屏弹窗 + vditor 编辑 Markdown；资讯前台展示于 /news 与首页，
 * 赛季规则由 AstrBot 的 /api/bot/rules 读取。
 */
export default function ContentManagement() {
  const { data: newsList, loading, error, refetch } = useFetch<NewsItem[]>(() =>
    api.get("/api/admin/news"),
  );
  const {
    data: rules,
    loading: rulesLoading,
    refetch: refetchRules,
  } = useFetch<SeasonRule[]>(() => api.get("/api/admin/rules"));

  // ---- 资讯表单 ----
  const [form, setForm] = useState<NewsInput | null>(null); // null = 弹窗关闭
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NewsItem | null>(null);
  const [delBusy, setDelBusy] = useState(false);

  // ---- 规则编辑（全屏弹窗） ----
  const [ruleDialog, setRuleDialog] = useState<RuleDialogState>(RULE_DIALOG_CLOSED);
  const [newSeason, setNewSeason] = useState("");
  const [ruleBusy, setRuleBusy] = useState(false);
  const [deleteRuleSeason, setDeleteRuleSeason] = useState<string | null>(null);

  const setField = <K extends keyof NewsInput>(k: K, v: NewsInput[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: todayLocal() });
  };

  const openEdit = async (item: NewsItem) => {
    const res = await api.get<NewsDetail>(`/api/news/${encodeURIComponent(item.slug)}`);
    if (!res.ok) {
      toast({ variant: "destructive", title: res.error.message });
      return;
    }
    const d = res.data;
    setEditingId(item.id);
    setForm({
      slug: d.slug,
      title: d.title,
      description: d.description,
      date: d.date,
      content: d.content,
      published: d.published,
    });
  };

  const saveForm = async () => {
    if (!form) return;
    // slug / 日期不在界面上暴露：日期缺省取当天，slug 缺省由标题生成
    const payload: NewsInput = {
      ...form,
      date: form.date || todayLocal(),
      slug: form.slug.trim() || slugFromTitle(form.title),
    };
    setFormBusy(true);
    let res =
      editingId === null
        ? await api.post<NewsDetail>("/api/admin/news", payload)
        : await api.put<NewsDetail>(`/api/admin/news/${editingId}`, payload);
    // 新建时自动 slug 可能撞名，自动追加序号重试（字段已隐藏，用户无法手动改）
    for (let n = 2; editingId === null && !res.ok && res.error.status === 409 && n <= 6; n++) {
      res = await api.post<NewsDetail>("/api/admin/news", {
        ...payload,
        slug: `${payload.slug}-${n}`,
      });
    }
    setFormBusy(false);
    if (res.ok) {
      toast({ title: editingId === null ? "资讯已创建" : "资讯已更新" });
      setForm(null);
      void refetch();
    } else {
      toast({ variant: "destructive", title: res.error.message });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDelBusy(true);
    const res = await api.delete(`/api/admin/news/${deleteTarget.id}`);
    setDelBusy(false);
    setDeleteTarget(null);
    if (res.ok) {
      toast({ title: "资讯已删除" });
      void refetch();
    } else {
      toast({ variant: "destructive", title: res.error.message });
    }
  };

  // ---- 规则操作 ----

  const openRuleEdit = (r: SeasonRule) =>
    setRuleDialog({ open: true, season: r.season, content: r.content, isNew: false });

  const openRuleNew = () => {
    const s = newSeason.trim().toLowerCase();
    if (!s) {
      toast({ variant: "destructive", title: "请先填写赛季 ID" });
      return;
    }
    if ((rules ?? []).some((r) => r.season === s)) {
      toast({ variant: "destructive", title: "该赛季已有规则记录" });
      return;
    }
    setRuleDialog({ open: true, season: s, content: "", isNew: true });
    setNewSeason("");
  };

  const saveRule = async () => {
    const season = ruleDialog.season.trim().toLowerCase();
    if (!season) {
      toast({ variant: "destructive", title: "赛季 ID 不能为空" });
      return;
    }
    if (!ruleDialog.content.trim()) {
      toast({ variant: "destructive", title: "规则内容不能为空" });
      return;
    }
    setRuleBusy(true);
    const res = await api.put(`/api/admin/rules/${encodeURIComponent(season)}`, {
      content: ruleDialog.content,
    });
    setRuleBusy(false);
    if (res.ok) {
      toast({ title: "规则已保存" });
      setRuleDialog(RULE_DIALOG_CLOSED);
      void refetchRules();
    } else {
      toast({ variant: "destructive", title: res.error.message });
    }
  };

  const confirmDeleteRule = async () => {
    if (!deleteRuleSeason) return;
    setRuleBusy(true);
    const res = await api.delete(`/api/admin/rules/${encodeURIComponent(deleteRuleSeason)}`);
    setRuleBusy(false);
    setDeleteRuleSeason(null);
    if (res.ok) {
      toast({ title: "规则已删除（Bot 将回退读取 rules/ 文件）" });
      setRuleDialog(RULE_DIALOG_CLOSED);
      void refetchRules();
    } else {
      toast({ variant: "destructive", title: res.error.message });
    }
  };

  if (loading) return <LoadingBlock label="加载资讯中…" />;
  if (error || !newsList)
    return <ErrorBlock message={error || "没有数据"} onRetry={() => void refetch()} />;

  /** 规则内容预览：取第一行非空文本 */
  const rulePreview = (content: string) => {
    const line = content.split("\n").find((l) => l.trim()) ?? "";
    return line.replace(/^#+\s*/, "").slice(0, 80);
  };

  return (
    <div className="p-6">
      {/* ============ 资讯 ============ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle tag="资讯管理" accent="#6b7fb5" className="mb-0">
          News
        </SectionTitle>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" /> 新建资讯
        </Button>
      </div>

      {newsList.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-(--pc-white) p-6 text-sm text-(--pc-slate) shadow-[2px_2px_0px_rgba(0,0,0,0.06)]">
          还没有资讯，点右上角「新建资讯」创建第一篇。
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl bg-(--pc-white) shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b-2 border-(--pc-border) text-left text-xs text-(--pc-faint)">
                <th className="px-4 py-3 font-bold">日期</th>
                <th className="px-4 py-3 font-bold">标题</th>
                <th className="px-4 py-3 font-bold">slug</th>
                <th className="px-4 py-3 font-bold">状态</th>
                <th className="px-4 py-3 text-right font-bold">操作</th>
              </tr>
            </thead>
            <tbody>
              {newsList.map((n) => (
                <tr
                  key={n.id}
                  className="border-b border-(--pc-border) last:border-0 hover:bg-(--pc-paper)"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-(--pc-slate)">
                    {n.date || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-(--pc-ink)">{n.title}</div>
                    {n.description && (
                      <div className="mt-0.5 text-xs text-(--pc-slate)">{n.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-(--pc-slate)">{n.slug}</td>
                  <td className="px-4 py-3">
                    {n.published ? (
                      <Badge variant="teal">已发布</Badge>
                    ) : (
                      <Badge variant="outline">草稿</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => void openEdit(n)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> 编辑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[#e85d75]"
                        onClick={() => setDeleteTarget(n)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> 删除
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 新建 / 编辑资讯：全屏弹窗 + vditor */}
      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className={FULLSCREEN}>
          <div className={DIALOG_HEAD_BAR}>
            <div className="min-w-0">
              <DialogTitle>{editingId === null ? "新建资讯" : "编辑资讯"}</DialogTitle>
              <DialogDescription className="mt-1">
                正文为 Markdown，保存后前台「赛事资讯」与首页立即生效。
              </DialogDescription>
            </div>
            <Button className="shrink-0" onClick={() => void saveForm()} disabled={formBusy}>
              {formBusy ? "保存中…" : "保存"}
            </Button>
          </div>
          {form && (
            <div className={DIALOG_BODY}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="news-title">标题 *</Label>
                  <Input
                    id="news-title"
                    value={form.title}
                    onChange={(e) => setField("title", e.target.value)}
                    placeholder="例如：AstraCup S2 开始报名"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="news-desc">摘要</Label>
                  <Input
                    id="news-desc"
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    placeholder="列表页展示的一句话简介"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>正文（Markdown）*</Label>
                  <MarkdownEditor
                    value={form.content}
                    onChange={(v) => setField("content", v)}
                    placeholder="# 标题&#10;&#10;正文内容……"
                    className="h-[55vh] w-full overflow-hidden rounded-xl border-2 border-(--pc-border)"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-(--pc-ink)">
                  <Checkbox
                    checked={form.published}
                    onCheckedChange={(v) => setField("published", v === true)}
                  />
                  立即发布（不勾选为草稿，前台不可见、仅管理员可预览）
                </label>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除资讯确认 */}
      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除资讯</DialogTitle>
            <DialogDescription>
              确定删除「{deleteTarget?.title}」吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={delBusy}>
              {delBusy ? "删除中…" : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ 赛季规则 ============ */}
      <div className="mt-10 border-t-2 border-(--pc-border) pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle tag="Bot 规则" accent="#5cb8a5" className="mb-0">
            赛季规则
          </SectionTitle>
          <div className="flex items-center gap-2">
            <Input
              value={newSeason}
              onChange={(e) => setNewSeason(e.target.value)}
              placeholder="新赛季 ID，如 s3"
              className="w-40"
            />
            <Button variant="outline" size="sm" onClick={openRuleNew}>
              <Plus className="mr-1 h-3.5 w-3.5" /> 新建
            </Button>
          </div>
        </div>
        {rulesLoading ? (
          <LoadingBlock label="加载规则中…" />
        ) : (
          <>
            <div className="mt-4 overflow-x-auto rounded-2xl bg-(--pc-white) shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b-2 border-(--pc-border) text-left text-xs text-(--pc-faint)">
                    <th className="px-4 py-3 font-bold">赛季</th>
                    <th className="px-4 py-3 font-bold">规则预览</th>
                    <th className="px-4 py-3 font-bold">更新时间</th>
                    <th className="px-4 py-3 text-right font-bold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {(rules ?? []).map((r) => (
                    <tr
                      key={r.season}
                      onClick={() => openRuleEdit(r)}
                      className={cn(
                        "cursor-pointer border-b border-(--pc-border) last:border-0 hover:bg-(--pc-paper)",
                        ruleDialog.open && ruleDialog.season === r.season && "bg-(--pc-paper)",
                      )}
                    >
                      <td className="px-4 py-3">
                        <Badge variant="teal">{r.season}</Badge>
                      </td>
                      <td className="max-w-[380px] px-4 py-3 font-mono text-xs text-(--pc-slate)">
                        <span className="line-clamp-2">{rulePreview(r.content)}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-(--pc-slate)">
                        {r.updatedAt ? formatDateTime(r.updatedAt) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openRuleEdit(r)}
                          >
                            <Pencil className="mr-1 h-3.5 w-3.5" /> 编辑
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[#e85d75]"
                            onClick={() => setDeleteRuleSeason(r.season)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" /> 删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(rules ?? []).length === 0 && !ruleDialog.open && (
              <p className="mt-4 rounded-2xl bg-(--pc-white) p-6 text-sm text-(--pc-slate) shadow-[2px_2px_0px_rgba(0,0,0,0.06)]">
                数据库里还没有赛季规则。输入赛季 ID 点「新建」，或先执行 sql/content_tables.sql
                完成迁移播种。
              </p>
            )}
          </>
        )}
      </div>

      {/* 规则编辑：全屏弹窗 + vditor */}
      <Dialog
        open={ruleDialog.open}
        onOpenChange={(o) => !o && setRuleDialog((d) => ({ ...d, open: false }))}
      >
        <DialogContent className={FULLSCREEN}>
          <DialogHeader className={DIALOG_HEAD}>
            <DialogTitle>
              {ruleDialog.isNew ? "新建赛季规则" : `编辑赛季规则 · ${ruleDialog.season}`}
            </DialogTitle>
            <DialogDescription>
              Markdown 正文，保存后写入 season_rules 表，Bot 立即生效。
            </DialogDescription>
          </DialogHeader>
          <div className={DIALOG_BODY}>
            <div className="grid gap-4">
              {ruleDialog.isNew ? (
                <div className="grid gap-2">
                  <Label htmlFor="rule-season">赛季 ID *</Label>
                  <Input
                    id="rule-season"
                    value={ruleDialog.season}
                    onChange={(e) =>
                      setRuleDialog((d) => ({ ...d, season: e.target.value.toLowerCase() }))
                    }
                    placeholder="s3"
                  />
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label>赛季</Label>
                  <div>
                    <Badge variant="teal">{ruleDialog.season}</Badge>
                  </div>
                </div>
              )}
              <div className="grid gap-2">
                <Label>规则正文（Markdown）*</Label>
                <MarkdownEditor
                  value={ruleDialog.content}
                  onChange={(v) => setRuleDialog((d) => ({ ...d, content: v }))}
                  placeholder="# 赛季规则……"
                  className="h-[65vh] w-full overflow-hidden rounded-xl border-2 border-(--pc-border)"
                />
              </div>
            </div>
          </div>
          <DialogFooter className={DIALOG_FOOT}>
            <span className="mr-auto self-center text-xs text-(--pc-faint)">
              {(rules ?? []).find((r) => r.season === ruleDialog.season)?.updatedAt
                ? `上次更新 ${formatDateTime(
                    (rules ?? []).find((r) => r.season === ruleDialog.season)!.updatedAt!,
                  )}`
                : "尚未保存到数据库"}
            </span>
            <Button variant="outline" onClick={() => setRuleDialog(RULE_DIALOG_CLOSED)}>
              取消
            </Button>
            <Button onClick={() => void saveRule()} disabled={ruleBusy}>
              <Save className="mr-1 h-3.5 w-3.5" />
              {ruleBusy ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除规则确认 */}
      <Dialog
        open={deleteRuleSeason !== null}
        onOpenChange={(o) => !o && setDeleteRuleSeason(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除赛季规则</DialogTitle>
            <DialogDescription>
              确定删除赛季「{deleteRuleSeason}」的规则吗？删除后 Bot 会回退读取 rules/
              目录下的同名文件。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRuleSeason(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDeleteRule()}
              disabled={ruleBusy}
            >
              {ruleBusy ? "删除中…" : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
