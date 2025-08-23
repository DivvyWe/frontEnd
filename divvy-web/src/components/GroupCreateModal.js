"use client";

import { useEffect, useRef, useState } from "react";
import { FiX, FiPlus, FiAlertCircle } from "react-icons/fi";
import { useRouter } from "next/navigation";

export default function GroupCreateModal({ open, onClose, onCreated }) {
  const router = useRouter();
  const nameRef = useRef(null);
  const panelRef = useRef(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Focus first field when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => nameRef.current?.focus(), 50);
      setError("");
    } else {
      setName("");
      setDescription("");
      setSubmitting(false);
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

  const CREATE_ENDPOINT = "/api/proxy/user/groups"; // <-- matches your backend

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
      const res = await fetch(CREATE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include", // ensure cookies get sent
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      console.log("[group/create] status:", res.status, "data:", data);

      if (res.status === 401) {
        router.replace("/auth/signin");
        return;
      }
      if (!res.ok) {
        setError(data?.message || "Failed to create group.");
        return;
      }

      onCreated?.(data);
      onClose?.();
      if (data?._id) router.push(`/groups/${data._id}`);
      else router.refresh();
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

      {/* Panel: sheet on mobile, centered dialog on md+ */}
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-lg md:inset-0 md:flex md items-center md:justify-center">
        <div
          ref={panelRef}
          className="
            w-full rounded-t-2xl bg-white p-5 shadow-xl ring-1 ring-black/10
            md:rounded-2xl md:p-6
            translate-y-0 md:translate-y-0
          "
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="group-name"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Group name
              </label>
              <input
                id="group-name"
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

            <div>
              <label
                htmlFor="group-description"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Description <span className="text-slate-400">(optional)</span>
              </label>
              <textarea
                id="group-description"
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/25"
                placeholder="Short note for members"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={280}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
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
