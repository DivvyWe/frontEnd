// src/lib/inviteClient.js
export const INVITE_TOKEN_KEY = "divsez_pendingInviteToken";

export async function processPendingInvite() {
  if (typeof window === "undefined") {
    return {
      handled: false,
      success: false,
      context: null,
      groupId: null,
      inviterId: null,
      inviterName: null,
      error: "Not in browser",
    };
  }

  const token = window.localStorage.getItem(INVITE_TOKEN_KEY);
  if (!token) {
    return {
      handled: false,
      success: false,
      context: null,
      groupId: null,
      inviterId: null,
      inviterName: null,
      error: null,
    };
  }

  window.localStorage.removeItem(INVITE_TOKEN_KEY);

  try {
    const res = await fetch(`/api/proxy/invites/${token}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      let msg = "Failed to accept invite";
      try {
        const data = await res.json();
        if (data?.message) msg = data.message;
      } catch {
        /* ignore */
      }

      return {
        handled: true,
        success: false,
        context: null,
        groupId: null,
        inviterId: null,
        inviterName: null,
        error: msg,
      };
    }

    const data = await res.json();

    return {
      handled: true,
      success: true,
      context: data.context || null,
      groupId: data.group?.id || null,
      inviterId: data.contact?.inviterId || null,
      inviterName: data.contact?.inviterName || null,
      error: null,
    };
  } catch (err) {
    console.error("processPendingInvite error:", err);
    return {
      handled: true,
      success: false,
      context: null,
      groupId: null,
      inviterId: null,
      inviterName: null,
      error: "Network error while accepting invite",
    };
  }
}
