import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn, osuAvatarUrl } from "@/lib/utils";

/** osu! 用户头像：优先使用自定义头像，回退 osu! 官方头像，再回退首字母占位 */
export default function UserAvatar({
  username,
  avatarUrl,
  osuId,
  className,
  fallbackClassName,
  uppercase = false,
}: {
  username?: string | null;
  avatarUrl?: string | null;
  osuId?: string | number;
  className?: string;
  /** 定制首字母占位的样式 */
  fallbackClassName?: string;
  /** 首字母是否大写 */
  uppercase?: boolean;
}) {
  const src = avatarUrl || (osuId != null ? osuAvatarUrl(osuId) : undefined);
  const initial = username?.slice(0, 1) || "?";
  return (
    <Avatar className={cn(className)}>
      {src && <AvatarImage src={src} alt={username ?? ""} />}
      <AvatarFallback className={cn(fallbackClassName)}>
        {uppercase ? initial.toUpperCase() : initial}
      </AvatarFallback>
    </Avatar>
  );
}
