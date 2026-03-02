import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const RefreshFloat = () => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    window.location.reload();
  };

  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      title="Sayfayı yenile"
      aria-label="Sayfayı yenile"
      onClick={handleRefresh}
      className="fixed bottom-7 left-7 z-[9998] h-12 w-12 rounded-full bg-white/95 shadow-lg backdrop-blur print:hidden"
    >
      <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
    </Button>
  );
};
