"use client";

import PushSoftPrompt from "@/components/push/PushSoftPrompt";
import PushTest from "@/components/pushtest";

export default function PushWidgets() {
  return (
    <div className="space-y-4">
      {/* Banner prompt if permission is default */}
      <PushSoftPrompt />

      {/* Enable + Send Test widget */}
      <PushTest />
    </div>
  );
}
