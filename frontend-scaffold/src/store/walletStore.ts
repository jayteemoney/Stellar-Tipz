import { create } from 'zustand';

type Network = 'TESTNET' | 'PUBLIC';

interface WalletState {
  publicKey: string | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  network: Network;
}

interface WalletActions {
  connect: (publicKey: string) => void;
  disconnect: () => void;
  setConnecting: (connecting: boolean) => void;
  setError: (error: string | null) => void;
  setNetwork: (network: Network) => void;
}

type WalletStore = WalletState & WalletActions;

export const useWalletStore = create<WalletStore>((set) => ({
  publicKey: null,
  connected: false,
  connecting: false,
  error: null,
  network: 'TESTNET',

  connect: (publicKey: string) => set({ publicKey, connected: true, connecting: false, error: null }),

  disconnect: () => set({ publicKey: null, connected: false, error: null }),

  setConnecting: (connecting: boolean) => set({ connecting }),

  setError: (error: string | null) => set({ error, connecting: false }),

  setNetwork: (network: Network) => set({ network }),
}));
