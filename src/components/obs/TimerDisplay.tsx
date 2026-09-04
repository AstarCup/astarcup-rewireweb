import type { OBSTimer } from "./types";

function fmtTime(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function TimerDisplay({
  timer,
  large = false,
}: {
  timer: OBSTimer;
  large?: boolean;
}) {
  return (
    <div className="inline-flex flex-col items-center">
      {timer.label && (
        <span className="mb-1 rounded-lg bg-[#f5c040]/20 px-2 py-0.5 text-xs font-bold text-[#2d2d2d]">
          {timer.label}
        </span>
      )}
      <span
        className={`rounded-2xl bg-white px-6 py-1.5 font-sans font-black text-[#2d2d2d] shadow-[3px_3px_0px_rgba(0,0,0,0.1)] ${
          large ? "text-5xl" : "text-3xl"
        }`}
      >
        {fmtTime(timer.seconds)}
      </span>
      <span className="mt-1 flex items-center gap-1.5 text-sm font-bold text-[#666666]">
        <i
          className={`inline-block h-2 w-2 rounded-full ${
            timer.running ? "animate-pulse bg-[#e85d75]" : "bg-[#b0a898]"
          }`}
        />
        {timer.running ? "计时中" : "已暂停"}
      </span>
    </div>
  );
}