import { useState, useEffect, useCallback } from "react";
import { env } from "../helpers/env";

export const useBalance = (publicKey: string | undefined | null) => {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!publicKey) {
      setBalance(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${env.horizonUrl}/accounts/${publicKey}`);
      if (!response.ok) {
        throw new Error(`Error fetching balance: ${response.statusText}`);
      }

      const data = await response.json();
      const nativeBalance = Array.isArray(data.balances)
        ? data.balances.find(
            (entry: { asset_type?: string; balance?: string }) =>
              entry.asset_type === "native"
          )
        : undefined;

      setBalance(nativeBalance?.balance || "0");
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch balance"
      );
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    let active = true;

    // Use an IIFE so we can abort state updates if unmounted
    void (async () => {
      if (!publicKey) {
        if (active) {
          setBalance(null);
          setLoading(false);
          setError(null);
        }
        return;
      }

      if (active) setLoading(true);

      try {
        const response = await fetch(`${env.horizonUrl}/accounts/${publicKey}`);
        if (!response.ok) {
          throw new Error(`Error fetching balance: ${response.statusText}`);
        }

        const data = await response.json();
        const nativeBalance = Array.isArray(data.balances)
          ? data.balances.find(
              (entry: { asset_type?: string; balance?: string }) =>
                entry.asset_type === "native"
            )
          : undefined;

        if (active) {
          setBalance(nativeBalance?.balance || "0");
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch balance"
          );
          setBalance(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [publicKey]);

  return { balance, loading, error, refetch: fetchBalance };
};
