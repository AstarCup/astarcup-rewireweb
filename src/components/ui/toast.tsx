import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import {
  CircleCheck,
  Info,
  Loader2,
  OctagonX,
  TriangleAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const toast = ToastPrimitive.createToastManager();

function ToastProvider(props: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />;
}

function ToastPortal(props: ToastPrimitive.Portal.Props) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />;
}

/** 视口固定在屏幕水平居中、垂直「中心再往下 1/4 屏」的位置，多条 toast 堆叠 */
function ToastViewport({
  className,
  children,
  ...props
}: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        "pointer-events-none fixed inset-0 z-[60] flex flex-col items-center justify-center p-4 outline-none",
        className,
      )}
      {...props}
    >
      <div className="flex w-full translate-y-[25vh] flex-col items-center gap-3">
        {children}
      </div>
    </ToastPrimitive.Viewport>
  );
}

function Toast({ className, ...props }: ToastPrimitive.Root.Props) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        "pointer-events-auto w-full max-w-md rounded-2xl border-2 border-(--pc-border) bg-(--pc-paper)",
        "shadow-[6px_6px_0px_rgba(0,0,0,0.14)] transition-all duration-200",
        "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
        "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn("flex items-start gap-3 p-4", className)}
      {...props}
    />
  );
}

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("text-sm font-bold text-(--pc-ink)", className)}
      {...props}
    />
  );
}

function ToastDescription({ className, ...props }: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("mt-0.5 text-xs leading-relaxed text-(--pc-slate)", className)}
      {...props}
    />
  );
}

function ToastAction({
  className,
  render = <Button variant="outline" size="sm" />,
  ...props
}: ToastPrimitive.Action.Props) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      render={render}
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}

function ToastClose({
  className,
  children,
  render = <Button variant="ghost" size="icon" />,
  ...props
}: ToastPrimitive.Close.Props) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="关闭提示"
      render={render}
      className={cn(
        "relative shrink-0 self-start text-(--pc-faint) transition-colors hover:text-(--pc-ink)",
        className,
      )}
      {...props}
    >
      {children ?? <X className="h-4 w-4" aria-hidden="true" />}
    </ToastPrimitive.Close>
  );
}

function ToastIcon({ type }: { type: string | undefined }) {
  if (type === "success") {
    return <CircleCheck className="h-5 w-5 shrink-0 text-pc-teal" aria-hidden="true" />;
  }
  if (type === "info") {
    return <Info className="h-5 w-5 shrink-0 text-pc-blue" aria-hidden="true" />;
  }
  if (type === "warning") {
    return <TriangleAlert className="h-5 w-5 shrink-0 text-pc-yellow" aria-hidden="true" />;
  }
  if (type === "error") {
    return <OctagonX className="h-5 w-5 shrink-0 text-pc-primary" aria-hidden="true" />;
  }
  if (type === "loading") {
    return <Loader2 className="h-5 w-5 shrink-0 animate-spin text-pc-teal" aria-hidden="true" />;
  }
  return null;
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();

  return toasts.map((toastItem) => (
    <Toast key={toastItem.id} toast={toastItem}>
      <ToastContent>
        <ToastIcon type={toastItem.type} />
        <div className="flex min-w-0 flex-1 flex-col">
          <ToastTitle />
          <ToastDescription />
        </div>
        <ToastAction />
        <ToastClose />
      </ToastContent>
    </Toast>
  ));
}

function Toaster({
  children,
  toastManager = toast,
  ...props
}: ToastPrimitive.Provider.Props) {
  return (
    <ToastProvider toastManager={toastManager} {...props}>
      {children}
      <ToastPortal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}

const createToastManager = ToastPrimitive.createToastManager;
const useToastManager = ToastPrimitive.useToastManager;

export {
  Toaster,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  createToastManager,
  toast,
  useToastManager,
};
