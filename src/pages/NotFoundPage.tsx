import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center md:px-8">
      <p className="font-display text-8xl font-bold text-pc-primary drop-shadow-[3px_3px_0px_rgba(0,0,0,0.12)]">
        404
      </p>
      <h1 className="mt-4 font-bold text-2xl text-(--pc-ink)">页面不存在</h1>
      <p className="mt-3 text-sm text-(--pc-slate)">
        你访问的页面可能已被移动、重命名或删除。
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg" variant="primary">
          <Link to="/">返回首页</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/schedule">查看赛程</Link>
        </Button>
        <Button asChild size="lg" variant="teal">
          <Link to="/contact">联系我们</Link>
        </Button>
      </div>
    </div>
  );
}
