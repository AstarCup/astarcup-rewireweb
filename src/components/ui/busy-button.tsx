import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

/** 按钮忙碌态封装：加载中自动替换图标为 spinner 并禁用 */
export function BusyButton({
  loading = false,
  icon,
  children,
  disabled,
  ...props
}: ButtonProps & { loading?: boolean; icon?: ReactNode }) {
  return (
    <Button disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </Button>
  );
}
