// src/components/expenses/ExpenseBasics.js
"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  Trash2,
  Loader2,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const fmtMoney = (n) => (Number(n) || 0).toFixed(2);

export default function ExpenseBasics({
  description,
  setDescription,
  amount,
  setAmount,
  submitting,
  onReceiptParsed,
}) {
  const [parseError, setParseError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState(null); // { rawText, amount, description, receiptImage }
  const [dragActive, setDragActive] = useState(false);
  const [localImageUrl, setLocalImageUrl] = useState(null);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef(null);

  const resetFileInput = () => {
    if (fileRef.current) fileRef.current.value = "";
  };

  const parseFile = useCallback(
    async (file) => {
      if (!file) return;
      setParseError("");
      setParsing(true);
      setPreview(null);

      try {
        const fd = new FormData();
        fd.append("image", file);

        // ✅ Correct backend proxy URL (ensure your Next API forwards this)
        const res = await fetch("/api/proxy/receipts/parse", {
          method: "POST",
          body: fd,
        });

        // Read once for better error surfacing
        const raw = await res.text();
        let data = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch {
          if (!res.ok) {
            throw new Error(raw || "Upstream error (non-JSON)");
          }
        }

        // 🌡️ Rate limit (2 parses/day per user)
        if (res.status === 429) {
          const serverMsg =
            data?.message ||
            data?.error ||
            "Daily receipt parse quota reached. You can parse up to 2 receipts per day.";
          setParseError(serverMsg);
          setParsing(false);
          // make sure we don't show stale preview if we hit the limit
          setPreview(null);
          return; // ✅ no throw => no console error
        }

        if (!res.ok) {
          const msg =
            data?.message || data?.error || raw || "Failed to parse receipt";
          const detailed =
            data?.error && data?.message
              ? `${data.message}: ${data.error}`
              : msg;
          throw new Error(detailed);
        }

        // ✅ Unwrap controller shape: { message, data: {...} }
        const payload = data?.data ?? data;

        // Auto-fill Description & Amount
        if (payload) {
          const merchant = payload?.merchantName?.trim?.() || "";
          const total = Number(payload?.totalAmount ?? payload?.amount) || 0;
          const date =
            payload?.usedDate || payload?.receiptDate || payload?.date || null;

          const formattedDate = date
            ? new Date(date).toISOString().split("T")[0]
            : "";

          const desc =
            merchant && formattedDate
              ? `${merchant} - ${formattedDate}`
              : merchant || formattedDate || payload?.description || "";

          if (desc) setDescription?.(desc);
          if (total > 0) setAmount?.(fmtMoney(total));
        }

        // Show parsed preview
        setPreview({
          rawText: payload?.rawText || "",
          amount:
            typeof payload?.totalAmount !== "undefined"
              ? fmtMoney(payload.totalAmount)
              : typeof payload?.amount !== "undefined"
              ? fmtMoney(payload.amount)
              : "",
          description:
            payload?.merchantName && payload?.usedDate
              ? `${payload.merchantName} - ${
                  new Date(payload.usedDate).toISOString().split("T")[0]
                }`
              : payload?.description || "",
          // backend sends cloudinaryUrl (keep receiptImage fallback just in case)
          receiptImage: payload?.cloudinaryUrl || payload?.receiptImage || null,
        });

        // Bubble parsed payload up
        onReceiptParsed?.(payload);
      } catch (err) {
        setParseError((err && err.message) || "Could not parse the receipt");
        // eslint-disable-next-line no-console
        console.error("[ExpenseBasics] parse error:", err);
      } finally {
        setParsing(false);
      }
    },
    [onReceiptParsed, setAmount, setDescription]
  );

  const handleChosenFile = async (file) => {
    if (!file) return;
    setLocalImageUrl(URL.createObjectURL(file));
    setFileName(file.name || "receipt");
    await parseFile(file);
  };

  async function handleFileChange(e) {
    await handleChosenFile(e.target.files?.[0]);
    resetFileInput();
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  async function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    await handleChosenFile(e.dataTransfer?.files?.[0]);
  }

  async function handlePaste(e) {
    const file = [...(e.clipboardData?.files || [])][0];
    if (file) await handleChosenFile(file);
  }

  function clearReceipt() {
    setPreview(null);
    setParseError("");
    setLocalImageUrl(null);
    setFileName("");
    resetFileInput();
  }

  return (
    <div className="grid grid-cols-1 gap-5" onPaste={handlePaste}>
      {/* Row: Description (left) + Amount (right) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700">
            Description
          </label>
          <input
            type="text"
            value={description}
            disabled={submitting}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Dinner"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none disabled:opacity-60"
          />
        </div>

        <div className="sm:col-span-1">
          <label className="block text-sm font-medium text-slate-700">
            Amount
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            disabled={submitting}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="120.00"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none disabled:opacity-60"
          />
        </div>
      </div>

      {/* Receipt uploader */}
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700">
            Receipt (optional)
          </label>
          <span className="text-xs text-slate-500">
            Limit: 2 image parses per day
          </span>
          {/* Parse status */}
          {parsing ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Parsing…
            </span>
          ) : preview ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" /> Parsed
            </span>
          ) : parseError ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
              <AlertCircle className="h-3.5 w-3.5" /> Error
            </span>
          ) : null}
        </div>

        {/* Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!parsing && !submitting) fileRef.current?.click();
          }}
          className={[
            "mt-1 cursor-pointer rounded-lg border-2 border-dashed p-4 transition active:scale-[0.99]",
            dragActive
              ? "border-[#84CC16] bg-[#f5fde9]"
              : "border-slate-300 bg-white hover:bg-slate-50",
          ].join(" ")}
        >
          {!localImageUrl ? (
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full bg-slate-50 p-3 ring-1 ring-slate-200">
                <Upload className="h-5 w-5 text-slate-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-700">
                  Drag & drop a receipt,{" "}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!parsing && !submitting) fileRef.current?.click();
                    }}
                    className="cursor-pointer font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:text-[#84CC16] hover:decoration-[#84CC16]"
                  >
                    browse
                  </span>
                  , or paste (Ctrl/Cmd + V)
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 flex-none overflow-hidden rounded-md ring-1 ring-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={localImageUrl}
                  alt="Receipt preview"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {fileName || "receipt"}
                </p>
                <p className="text-xs text-slate-500">
                  Click or drop to replace
                </p>
                {parseError && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-rose-700">
                    <AlertCircle className="h-3.5 w-3.5" /> {parseError}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearReceipt();
                  }}
                  disabled={parsing || submitting}
                  className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            disabled={parsing || submitting}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Parsed preview */}
        {preview &&
        (preview.description || preview.amount || preview.rawText) ? (
          <div className="mt-3 space-y-2 rounded-md border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <FileText className="h-4 w-4" />
              Parsed preview
            </div>
            <dl className="grid grid-cols-3 gap-2 text-xs text-slate-600">
              <dt className="col-span-1">Description:</dt>
              <dd className="col-span-2">{preview.description || "—"}</dd>
              <dt className="col-span-1">Amount:</dt>
              <dd className="col-span-2">
                {preview.amount ? `$${preview.amount}` : "—"}
              </dd>
            </dl>
            {preview.rawText && (
              <details className="text-xs text-slate-600">
                <summary className="cursor-pointer select-none text-slate-700">
                  Raw receipt text
                </summary>
                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2">
                  {preview.rawText}
                </pre>
              </details>
            )}
            <p className="mt-2 text-xs text-slate-500 italic">
              ⚠️ This is an automatic read from your receipt. While it usually
              gets the total and store name right, please double-check the
              details before saving — especially if the image is unclear or the
              text layout is unusual.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
