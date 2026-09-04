import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";
import { LoadingBlock, ErrorBlock } from "@/hooks/useFetch";
import { api, qs, blob, downloadBlob } from "@/lib/api";
import { SectionTitle } from "@/components/paper/paper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function ReplayCollectionManagement() {
  const { user, settings } = useApp();
  const [season, setSeason] = useState("");
  const [category, setCategory] = useState("全部");
  const [uploaded, setUploaded] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [files, setFiles] = useState<string[]>([]);

  const seasonOptions = settings?.availableSeasons ?? [];

  const loadUploaded = async () => {
    setLoading(true);
    const res = await api.get<Record<string, string[]>>(
      "/api/replays/uploaded" +
        qs({
          season: season || undefined,
          category: category === "全部" ? undefined : category,
        }),
    );
    setLoading(false);
    if (res.ok) setUploaded(res.data);
    else setError(res.error.message);
  };

  useEffect(() => {
    void loadUploaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season, category]);

  const downloadAll = async () => {
    setBusy("download");
    setMsg("");
    try {
      const b = await blob(
        "/api/replays/archive" +
          qs({
            season: season || undefined,
            category: category === "全部" ? undefined : category,
          }),
      );
      downloadBlob(b, `replays-${season || "all"}-${category}.zip`);
      setMsg("已开始下载");
    } catch {
      setMsg("下载失败");
    }
    setBusy("");
  };

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy("upload");
    setMsg("");
    void (async () => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("filename", file.name);
      fd.append("userId", user?.osuId ?? "");
      const res = await api.post<{ url: string }>("/api/replays", fd, { json: false });
      setBusy("");
      if (res.ok) {
        setMsg("上传成功");
        setFiles((fs) => [file.name, ...fs]);
        void loadUploaded();
      } else {
        setMsg("上传失败");
      }
    })();
    e.target.value = "";
  };

  const removeFile = async (filename: string) => {
    setBusy(`del-${filename}`);
    const res = await api.delete("/api/replays", { filename, userId: user?.osuId });
    setBusy("");
    if (res.ok) {
      setFiles((fs) => fs.filter((f) => f !== filename));
      setMsg("已删除");
      void loadUploaded();
    } else {
      setMsg("删除失败");
    }
  };

  const entries = Object.entries(uploaded);

  return (
    <div>
      <SectionTitle tag="回放收集" accent="#6b7fb5">
        已上传回放
      </SectionTitle>

      {/* Filters + actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-[#b0a898]">赛季</Label>
          <Select value={season} onValueChange={setSeason}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              {seasonOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-[#b0a898]">分类</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="全部">全部</SelectItem>
              <SelectItem value="资格赛">资格赛</SelectItem>
              <SelectItem value="32强">32强</SelectItem>
              <SelectItem value="16强">16强</SelectItem>
              <SelectItem value="8强">8强</SelectItem>
              <SelectItem value="半决赛">半决赛</SelectItem>
              <SelectItem value="决赛">决赛</SelectItem>
              <SelectItem value="总决赛">总决赛</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="cursor-pointer rounded-xl border-2 border-[#e85d75] bg-[#e85d75] px-4 py-2 text-sm font-bold text-[#fdf6ee] shadow-[3px_3px_0px_rgba(0,0,0,0.1)] transition hover:-translate-y-0.5">
            {busy === "upload" ? "上传中…" : "上传回放"}
            <input type="file" accept=".osr" className="hidden" onChange={pickFile} />
          </label>
          <Button
            variant="teal"
            onClick={downloadAll}
            disabled={busy === "download"}
          >
            {busy === "download" ? "下载中…" : "下载全部回放"}
          </Button>
        </div>
      </div>

      {msg && (
        <Badge variant={msg.includes("失败") ? "primary" : "teal"} className="mt-4">
          {msg}
        </Badge>
      )}

      {loading ? (
        <LoadingBlock label="加载回放列表…" />
      ) : error ? (
        <ErrorBlock message={error} onRetry={() => void loadUploaded()} />
      ) : (
        <div className="mt-4">
          {entries.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#b0a898]">当前条件下没有回放。</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {entries.map(([key, usernames]) => (
                <Card key={key} className="p-4">
                  <p className="font-bold text-[#2d2d2d]">{key}</p>
                  <p className="mt-2 flex flex-wrap gap-1.5">
                    {usernames.map((u) => (
                      <Badge key={u} variant="outline">
                        {u}
                      </Badge>
                    ))}
                  </p>
                </Card>
              ))}
            </div>
          )}

          <Separator className="my-6" />
          <div>
            <p className="mb-3 text-sm font-bold text-[#2d2d2d]">本次会话上传的文件</p>
            {files.length === 0 ? (
              <p className="text-xs text-[#b0a898]">本次会话尚未上传文件。</p>
            ) : (
              <div className="space-y-2">
                {files.map((f) => (
                  <div
                    key={f}
                    className="flex items-center justify-between gap-3 rounded-xl border-2 border-[#e0d8cc] bg-white p-3"
                  >
                    <span className="text-sm text-[#2d2d2d]">{f}</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => void removeFile(f)}
                      disabled={busy === `del-${f}`}
                    >
                      删除
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}