"use client";
import { useEffect } from "react";
import { useAppStore } from "@/lib/stores/useAppStore";
import type { MainSection, RecetarioTab } from "@/types";
const sections = ["hoy", "recetario", "hogar", "ajustes"];
const tabs = ["calendar", "market", "recipes", "suggestions", "diets"];

export function useAppNavigation() {
  useEffect(() => {
    let restoring = false;
    const restore = () => {
      restoring = true;
      const params = new URLSearchParams(location.search);
      const tab = params.get("tab");
      const section = params.get("section") ?? (tab ? "recetario" : "hoy");
      useAppStore.setState({
        activeSection: (sections.includes(section)
          ? section
          : "hoy") as MainSection,
        recetarioTab: (tab && tabs.includes(tab)
          ? tab
          : "calendar") as RecetarioTab,
        fabOpen: false,
      });
      restoring = false;
    };
    restore();
    const unsubscribe = useAppStore.subscribe((state, prev) => {
      if (
        restoring ||
        (state.activeSection === prev.activeSection &&
          state.recetarioTab === prev.recetarioTab)
      )
        return;
      const url = new URL(location.href);
      url.searchParams.set("section", state.activeSection);
      if (state.activeSection === "recetario")
        url.searchParams.set("tab", state.recetarioTab);
      else url.searchParams.delete("tab");
      window.history.pushState(null, "", url);
    });
    window.addEventListener("popstate", restore);
    return () => {
      unsubscribe();
      window.removeEventListener("popstate", restore);
    };
  }, []);
}
