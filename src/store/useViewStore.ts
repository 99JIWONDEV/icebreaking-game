import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LanguageMode = "ko" | "en" | "both";

type ViewState = {
  mode: LanguageMode;
  setMode: (mode: LanguageMode) => void;
  /** "all" or a category id — personal screen setting, never sent to the table. */
  category: string;
  setCategory: (category: string) => void;
  tableNumber: number | null;
  setTableNumber: (tableNumber: number | null) => void;
};

export const useViewStore = create<ViewState>()(
  persist(
    (set) => ({
      mode: "both",
      setMode: (mode) => set({ mode }),
      category: "all",
      setCategory: (category) => set({ category }),
      tableNumber: null,
      setTableNumber: (tableNumber) => set({ tableNumber }),
    }),
    { name: "icebreaker:view" },
  ),
);
