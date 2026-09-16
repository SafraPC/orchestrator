import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { ListeningPortDto } from "../api/types";

export function useListeningPorts(active: boolean) {
  const [ports, setPorts] = useState<ListeningPortDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.listListeningPorts();
      setPorts(Array.isArray(result) ? result : []);
      setError(null);
    } catch (e) {
      setPorts([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) {
      setPorts([]);
      setError(null);
      return;
    }
    void refresh();
  }, [active, refresh]);

  return { ports, loading, error, refresh };
}
