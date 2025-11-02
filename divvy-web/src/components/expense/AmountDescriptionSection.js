// src/components/expenses/AmountDescriptionSection.jsx
"use client";

import { useMemo, useRef, useState } from "react";
import { FiX, FiUpload, FiImage, FiTrash2 } from "react-icons/fi";

export default function AmountDescriptionSection({
  // controlled inputs
  description,
  setDescription,
  amount,
  setAmount,

  // optional validations coming from parent (show-only)
  amountError = "",
  descriptionError = "",

  // submission state
  submitting = false,

  // receipt image (optional)
  enableReceipt = true,
  initialReceiptFile = null,
  onReceiptSelected, // (file) => void
  onReceiptCleared, // () => void

  // OCR hook (optional)
  onParseReceipt, // () => void
  parsing = false, // external flag while OCR is running

  // optional: description length hint (won't block typing)
  descriptionMax = undefined, // e.g., 120; if undefined, no counter
}) {
  const fileInputRef = useRef(null);
  const [localPreview, setLocalPreview] = useState(null);

  // keep parent-controlled initial file shown if preview not generated yet
  const hasReceipt = useMemo(
    () => !!localPreview || !!initialReceiptFile,
    [localPreview, initialReceiptFile]
  );

  const previewUrl = useMemo(() => {
    // prefer local preview if set; else try object URL for initial file
    if (localPreview) return localPreview;
    if (initialReceiptFile instanceof File) {
      return URL.createObjectURL(initialReceiptFile);
    }
    return null;
  }, [localPreview, initialReceiptFile]);

  const handleFilePick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLocalPreview(URL.createObjectURL(f));
    onReceiptSelected?.(f);
  };

  const clearFile = () => {
    setLocalPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onReceiptCleared?.();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      {/* Top labels */}
      <div className="mb-3 grid grid-cols-12 gap-3">
        <div className="col-span-8">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Description
          </label>
          <input
            type="text"
            className={[
              "w-full rounded-lg border px-3 py-2 text-sm outline-none",
              descriptionError
                ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                : "border-slate-300 focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/25",
            ].join(" ")}
            placeholder="e.g., Groceries, Fuel, Dinner at Spice Hub"
            value={description}
            onChange={(e) => setDescription?.(e.target.value)}
            disabled={submitting}
            maxLength={descriptionMax || undefined}
          />
          {/* helper: counter + error */}
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-red-600">
              {descriptionError || ""}
            </span>
            {descriptionMax ? (
              <span
                className={[
                  "text-xs",
                  (description?.length || 0) >= descriptionMax
                    ? "text-amber-700"
                    : "text-slate-500",
                ].join(" ")}
              >
                {description?.length || 0}/{descriptionMax}
                {(description?.length || 0) >= descriptionMax
                  ? " – limit reached"
                  : ""}
              </span>
            ) : null}
          </div>
        </div>

        <div className="col-span-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Amount
          </label>
          <div
            className={[
              "flex items-center rounded-lg border px-2",
              amountError
                ? "border-red-300 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100"
                : "border-slate-300 focus-within:border-[#84CC16] focus-within:ring-2 focus-within:ring-[#84CC16]/25",
            ].join(" ")}
          >
            <span className="select-none text-slate-500">$</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className="w-full bg-transparent px-2 py-2 text-sm outline-none"
              placeholder="0.00"
              value={Number.isFinite(amount) ? amount : ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  setAmount?.("");
                  return;
                }
                // keep two decimal precision in state (non-blocking)
                const n = Math.max(0, Number(v));
                const fixed = Number.isFinite(n) ? +n.toFixed(2) : "";
                setAmount?.(fixed);
              }}
              disabled={submitting}
            />
          </div>
          <div className="mt-1 text-xs text-red-600">{amountError || ""}</div>
        </div>
      </div>

      {/* Receipt uploader (optional) */}
      {enableReceipt ? (
        <div className="rounded-lg border border-slate-200 p-2">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <FiImage className="h-4 w-4" />
              Receipt (optional)
            </div>

            <div className="flex items-center gap-2">
              {onParseReceipt ? (
                <button
                  type="button"
                  onClick={onParseReceipt}
                  disabled={submitting || !hasReceipt || parsing}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  title="Extract total/lines with OCR"
                >
                  {parsing ? "Parsing…" : "Parse"}
                </button>
              ) : null}

              {hasReceipt ? (
                <button
                  type="button"
                  onClick={clearFile}
                  disabled={submitting}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  title="Remove file"
                >
                  <FiTrash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFilePick}
                    className="hidden"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    title="Upload receipt photo"
                  >
                    <FiUpload className="h-3.5 w-3.5" />
                    Upload
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Preview */}
          {hasReceipt ? (
            <div className="relative overflow-hidden rounded-md">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Receipt preview"
                  className="max-h-64 w-full object-contain"
                />
              ) : (
                <div className="grid h-24 place-items-center text-xs text-slate-500">
                  Preview not available
                </div>
              )}
              <button
                type="button"
                onClick={clearFile}
                disabled={submitting}
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-slate-700 shadow ring-1 ring-black/5"
                aria-label="Remove receipt"
                title="Remove receipt"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
