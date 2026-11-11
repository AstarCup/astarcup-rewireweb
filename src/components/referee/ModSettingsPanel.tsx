import {
  currentPlaylistItem,
  displayName,
  hasModSettings,
  modSettingsText,
  type RefMod,
  type RefRoomState,
} from "@/lib/ref";
import { ModIcon } from "@/components/referee/ModPicker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ModList({ mods }: { mods: RefMod[] }) {
  return (
    <div className="flex flex-col gap-1">
      {mods.map((m) => (
        <div key={m.acronym} className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="flex items-center gap-1">
            <ModIcon acronym={m.acronym} className="h-2.5 w-auto" />
            {m.acronym}
          </Badge>
          {hasModSettings(m) && (
            <span className="font-mono text-xs text-(--pc-faint)">{modSettingsText(m)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

interface ModSettingsPanelProps {
  room: RefRoomState;
}

/** 右栏中部：当前图必选 mod + 每玩家 mods（简版：settings 原样展示） */
export default function ModSettingsPanel({ room }: ModSettingsPanelProps) {
  const current = currentPlaylistItem(room);
  const playersWithMods = Object.values(room.players).filter((p) => p.mods.length > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base md:text-lg">Mod 设置</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="rounded-xl border-2 border-(--pc-border) bg-(--pc-paper) p-3">
          <div className="mb-2 text-sm font-bold text-(--pc-ink)">当前图必选 mod</div>
          {current && current.required_mods.length > 0 ? (
            <ModList mods={current.required_mods} />
          ) : (
            <p className="text-xs text-(--pc-faint)">无必选 mod</p>
          )}
        </div>

        <div>
          <div className="mb-2 text-sm font-bold text-(--pc-ink)">玩家 mod</div>
          <div className="flex flex-col gap-2">
            {playersWithMods.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border-2 border-(--pc-border) bg-(--pc-paper) p-3"
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs font-bold text-(--pc-slate)">
                  {displayName(p.user, p.id)}
                  <span className="inline-flex items-center gap-1">
                    {p.mods.map((m) => (
                      <span key={m.acronym} title={m.acronym}>
                        <ModIcon acronym={m.acronym} className="h-3 w-auto" />
                      </span>
                    ))}
                  </span>
                </div>
                <ModList mods={p.mods.filter(hasModSettings)} />
              </div>
            ))}
            {playersWithMods.length === 0 && (
              <p className="text-xs text-(--pc-faint)">暂无玩家选择 mod</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
