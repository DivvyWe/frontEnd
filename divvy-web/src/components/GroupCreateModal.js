// src/components/GroupCreateModal.js
"use client";

import { useEffect, useRef, useState } from "react";
import { FiX, FiPlus, FiAlertCircle } from "react-icons/fi";
import { useRouter } from "next/navigation";
import PeoplePicker from "@/components/people/PeoplePicker";

export default function GroupCreateModal({ open, onClose, onCreated }) {
  const router = useRouter();
  const nameRef = useRef(null);

  // Basics
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Selected existing users (IDs only)
  const [selectedIds, setSelectedIds] = useState([]); // string[]

  // Endpoints
  const CREATE_ENDPOINT = "/api/proxy/user/groups"; // POST /user/groups
  const INVITE_ENDPOINT = "/api/proxy/user/groups/invite"; // POST /user/groups/invite

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setTimeout(() => nameRef.current?.focus(), 50);
      setError("");
      setSelectedIds([]);
    } else {
      setName("");
      setSubmitting(false);
      setSelectedIds([]);
      setError("");
    }
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a group name.");
      nameRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // 1) Create the group
      const res = await fetch(CREATE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json().catch(() => ({}));
      const group = data?.group || data;
      const groupId = group?._id;

      if (res.status === 401) {
        router.replace("/auth/signin");
        return;
      }
      if (!res.ok || !groupId) {
        setError(data?.message || "Failed to create group.");
        return;
      }

      // 2) Invite selected users (IDs only; no email invites)
      if (selectedIds.length > 0) {
        try {
          await fetch(INVITE_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              groupId,
              userIdsToInvite: selectedIds,
            }),
          }).then((r) => r.json().catch(() => ({})));
        } catch {}
      }

      onCreated?.(group);
      onClose?.();
      router.push(`/groups/${groupId}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
      />

      {/* Centered panel wrapper (always centered) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl ring-1 ring-black/10 md:p-6"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#84CC16]/15 text-[#1f2937]">
                <FiPlus className="h-4 w-4 text-[#84CC16]" />
              </div>
              <h2 className="text-base font-semibold text-slate-800">
                New group
              </h2>
            </div>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
              aria-label="Close"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          {/* Error */}
          {error ? (
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
              <FiAlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : null}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Group name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Group name
              </label>
              <input
                ref={nameRef}
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/25"
                placeholder="Roommates, Trip to Bali, Dinner club…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                required
              />
            </div>

            {/* People Picker (IDs only; no email invites) */}
            <PeoplePicker onChangeSelected={(ids) => setSelectedIds(ids)} />

            {/* Actions */}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#84CC16] px-3 py-2 text-sm font-semibold text-white hover:bg-[#76b514] disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    Creating…
                  </>
                ) : (
                  <>
                    <FiPlus className="h-4 w-4" />
                    Create
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
