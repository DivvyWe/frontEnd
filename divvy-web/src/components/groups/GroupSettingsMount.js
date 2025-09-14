"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

// Lazy-load the modal only on the client
const GroupSettingsModal = dynamic(() => import("./GroupSettingsModal"), {
  ssr: false,
});

export default function GroupSettingsMount({ open, group, me, groupId }) {
  const router = useRouter();
  if (!open) return null;

  return (
    <GroupSettingsModal
      open
      group={group}
      me={me}
      onClose={() => router.replace(`/groups/${groupId}`)} // remove ?settings=1
    />
  );
}
