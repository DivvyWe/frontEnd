"use client";
import { useParams } from "next/navigation";
import LoadingScreen from "@/components/ui/LoadingScreen";

export default function Loading() {
  const { groupId } = useParams();
  return (
    <LoadingScreen
      title={`Loading group ${groupId}`}
      message="Fetching group details…"
    />
  );
}
