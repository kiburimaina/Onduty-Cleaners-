import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { syncSession } from "@/lib/api";
import { useCurrentUser } from "@/lib/auth/use-current-user";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();
  useEffect(() => {
    void useAppStore.persist.rehydrate();
  }, []);
  useEffect(() => {
    if (!user) return;
    void syncSession({ data: { name: user.displayName ?? "" } }).catch(() => undefined);
  }, [user?.id, user?.displayName]);
  return children;
}
