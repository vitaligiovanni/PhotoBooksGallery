import { PopupManager } from "@/components/popups/PopupManager";
import { usePopups } from "@/hooks/usePopups";

export function AppPopups() {
  const { data: popups = [] } = usePopups();

  return <PopupManager popups={popups} />;
}