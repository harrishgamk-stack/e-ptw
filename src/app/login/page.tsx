"use client";
import { WeeklyHome } from "@/features/weekly/home";
import { useWeekly } from "@/features/weekly/store";
import StaffLogin from "@/components/staff-login";
export default function Page() {
  const { enabled } = useWeekly();
  return enabled ? <WeeklyHome /> : <StaffLogin />;
}
