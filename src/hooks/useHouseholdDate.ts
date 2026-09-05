"use client";
import { useEffect, useState } from "react";
import { householdDate } from "@/lib/menu-date";
export function useHouseholdDate() {
  const [date, setDate] = useState(() => householdDate());
  useEffect(() => {
    const refresh = () => setDate(householdDate());
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return date;
}
