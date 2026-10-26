import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import type { AuthMe, Permissions, SessionUser, Settings } from "@/lib/types";

interface AppContextValue {
  user: SessionUser | null;
  permissions: Permissions | null;
  loading: boolean;
  /** Re-fetch session & permissions. Returns true if a user is logged in. */
  refresh: () => Promise<boolean>;
  settings: Settings | null;
  /** 站点设置的请求是否已结束（无论成功失败），用于避免永久 loading。 */
  settingsLoaded: boolean;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const res = await api.get<AuthMe>("/api/auth/me");
    if (res.ok) {
      setUser(res.data.user);
      setPermissions(res.data.permissions);
      return true;
    }
    setUser(null);
    setPermissions(null);
    return false;
  }, []);

  const refreshSettings = useCallback(async () => {
    const res = await api.get<Settings>("/api/settings");
    if (res.ok) setSettings(res.data);
  }, []);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
    void refreshSettings().finally(() => setSettingsLoaded(true));
  }, [refresh, refreshSettings]);

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout");
    setUser(null);
    setPermissions(null);
  }, []);

  const value = useMemo(
    () => ({ user, permissions, loading, refresh, settings, settingsLoaded, logout }),
    [user, permissions, loading, refresh, settings, settingsLoaded, logout],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}