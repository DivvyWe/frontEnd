// src/app/invite/[token]/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const INVITE_TOKEN_KEY = "divsez_pendingInviteToken";

export default function InvitePage() {
  const { token } = useParams();
  const router = useRouter();
  const [message, setMessage] = useState("Processing your invite…");
  const [status, setStatus] = useState("loading"); // loading | redirecting | error | success

  useEffect(() => {
    if (!token) return;

    const handleInvite = async () => {
      try {
        setStatus("loading");
        setMessage("Checking your invite…");

        const res = await fetch(`/api/proxy/invites/${token}/accept`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        // Not logged in: save token + send to login
        if (res.status === 401 || res.status === 403) {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(INVITE_TOKEN_KEY, String(token));
          }
          setStatus("redirecting");
          setMessage("You need to sign in to accept this invite. Redirecting…");

          router.push(
            `/login?inviteToken=${encodeURIComponent(String(token))}`
          );
          return;
        }

        // Invalid / expired invite
        if (!res.ok) {
          let errMsg = "This invite is invalid or has expired.";
          try {
            const data = await res.json();
            if (data?.message) errMsg = data.message;
          } catch {
            // ignore JSON parse errors
          }
          setStatus("error");
          setMessage(errMsg);
          return;
        }

        // Accepted successfully
        const data = await res.json();
        setStatus("success");

        if (data.context === "group" && data.group?.id) {
          setMessage("Invite accepted! Redirecting you to the group…");
          router.replace(`/groups/${data.group.id}`);
          return;
        }

        if (data.context === "contact") {
          setMessage("You’re now connected! Redirecting to your contacts…");
          router.replace("/contacts");
          return;
        }

        // Fallback: generic success
        setMessage("Invite accepted successfully.");
      } catch (err) {
        console.error("Error processing invite:", err);
        setStatus("error");
        setMessage("Something went wrong while processing this invite.");
      }
    };

    handleInvite();
  }, [token, router]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold mb-3">Divsez Invite</h1>
        <p className="text-sm text-gray-500 mb-4">{message}</p>

        {status === "error" && (
          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium"
          >
            Go to home
          </button>
        )}
      </div>
    </main>
  );
}
