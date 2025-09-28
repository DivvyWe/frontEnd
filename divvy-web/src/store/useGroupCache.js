"use client";
import { create } from "zustand";

export const useGroupCache = create((set) => ({
  lastClicked: null, // { id, name }
  namesById: {}, // { [id]: name }
  setLastClicked: (g) => set({ lastClicked: g }),
  remember: ({ id, name }) =>
    set((s) => ({ namesById: { ...s.namesById, [id]: name } })),
}));
