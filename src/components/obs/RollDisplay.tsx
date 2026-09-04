import type { OBSRoll, TeamKey } from "./types";

const ACCENT: Record<TeamKey, string> = { red: "#e85d75", blue: "#6b7fb5" };

export function RollDisplay({
  roll,
  redName,
  blueName,
}: {
  roll: OBSRoll;
  redName: string;
  blueName: string;
}) {
  const sides: { key: TeamKey; label: string }[] = [
    { key: "red", label: redName || "红方" },
    { key: "blue", label: blueName || "蓝方" },
  ];
  return (
    <div className="inline-flex flex-col items-center gap-2">
      <span className="rounded-lg bg-[#6b7fb5]/15 px-2 py-0.5 text-xs font-bold text-[#2d2d2d]">
        掷骰决胜
      </span>
      <div className="flex items-center gap-3">
        {sides.map(({ key, label }) => (
          <div
            key={key}
            className="flex min-w-[120px] flex-col items-center rounded-2xl bg-white px-4 py-2 shadow-[3px_3px_0px_rgba(0,0,0,0.1)]"
          >
            <span className="max-w-[100px] truncate text-xs font-bold text-[#666666]">{label}</span>
            <span className="font-sans text-4xl font-black" style={{ color: ACCENT[key] }}>
              {roll[key]}
            </span>
          </div>
        ))}
      </div>
      {roll.done && (
        <span className="rounded-lg bg-[#5cb8a5] px-2 py-0.5 text-xs font-bold text-[#fdf6ee]">
          先手：{roll.red > roll.blue ? redName || "红方" : roll.blue > roll.red ? blueName || "蓝方" : "平局"}
        </span>
      )}
    </div>
  );
}