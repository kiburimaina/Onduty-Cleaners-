import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Cadence, HomeSize, LaundryLoad, LaundryMode, ServiceId, ShopOffer, WhenKind } from "./types";

export type Draft = {
  serviceId: ServiceId;
  size: HomeSize;
  whenKind: WhenKind;
  scheduledFor: string;
  address: string;
  notes: string;
  cleanerId: string | null;
  laundryMode: LaundryMode;
  laundryLoad: LaundryLoad;
  plantId: string;
  addLaundry: boolean;
  cadence: Cadence;
  offer: ShopOffer;
  pieces: { id: string; qty: number }[];
};

const defaultDraft: Draft = {
  serviceId: "standard",
  size: "2br",
  whenKind: "now",
  scheduledFor: "",
  address: "284 Riverside Ave",
  notes: "",
  cleanerId: null,
  laundryMode: "collect",
  laundryLoad: "medium",
  plantId: "harbor",
  addLaundry: false,
  cadence: "none",
  offer: "wash",
  pieces: [],
};

type AppState = {
  draft: Draft;
  setDraft: (patch: Partial<Draft>) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      draft: defaultDraft,
      setDraft: (patch) => set({ draft: { ...get().draft, ...patch } }),
    }),
    {
      name: "onduty-draft",
      skipHydration: true,
      merge: (persisted, current) => {
        const p = persisted as Partial<AppState> | undefined;
        return { ...current, draft: { ...defaultDraft, ...p?.draft } };
      },
    },
  ),
);
