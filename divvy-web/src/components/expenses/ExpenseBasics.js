// src/components/expenses/ExpenseBasics.js
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
  const [isMobile, setIsMobile] = useState(false);
  const fileRef = useRef(null);

  // 🧠 Detect mobile to change UI (desktop: dropzone, mobile: camera/gallery button)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = window.navigator.userAgent || "";
    setIsMobile(/Android|iPhone|iPad|iPod|Mobile/i.test(ua));
  }, []);

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
            // Non-JSON error from backend – treat as upstream error text
            setParseError(
              raw || "Receipt service returned an invalid response."
            );
            setParsing(false);
            setPreview(null);
            return;
          }
        }

        // 🌡️ Rate limit (2 parses/day per user OR backend 429)
        if (res.status === 429 || data?.code === "AI_RATE_LIMIT") {
          const serverMsg =
            data?.message ||
            data?.error ||
            "Daily receipt parse quota reached. You can parse up to 2 receipts per day.";
          setParseError(serverMsg);
          setParsing(false);
          setPreview(null);
          return;
        }

        // 🧯 AI overloaded / service unavailable (backend maps to 503 or passes message)
        const msgFromServer =
          data?.message || data?.error || raw || "Failed to parse receipt";

        if (
          res.status === 503 ||
          msgFromServer.includes("503 Service Unavailable") ||
          msgFromServer.toLowerCase().includes("model is overloaded") ||
          data?.code === "AI_OVERLOADED"
        ) {
          setParseError(
            data?.message ||
              "Our receipt reader is temporarily overloaded. Please try again in a moment, or just enter the amount manually."
          );
          setParsing(false);
          setPreview(null);
          return; // ✅ do NOT throw – handled gracefully
        }

        // Any other non-OK status => real error
        if (!res.ok) {
          const detailed =
            data?.error && data?.message
              ? `${data.message}: ${data.error}`
              : msgFromServer;
          throw new Error(detailed);
        }

        // ✅ Unwrap controller shape: { message, data: {...} }
        const payload = data?.data ?? data;

        // ---------- Normalise some fields for the parent ----------
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

        // Auto-fill Description & Amount into the form
        if (desc) setDescription?.(desc);
        if (total > 0) setAmount?.(fmtMoney(total));

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
            merchant && date
              ? `${merchant} - ${new Date(date).toISOString().split("T")[0]}`
              : payload?.description || desc || "",
          receiptImage: payload?.cloudinaryUrl || payload?.receiptImage || null,
        });

        // 🔁 Build enriched payload for parent (items stay as-is from backend)
        const enrichedPayload = {
          ...payload,
          merchantName: merchant || payload?.merchantName,
          totalAmount: total,
          usedDate: date || payload?.usedDate || null,
          descriptionSuggestion: desc,
        };

        // Bubble parsed payload up (for item-based split, etc.)
        onReceiptParsed?.(enrichedPayload);
      } catch (err) {
        const rawMsg = (err && err.message) || "Could not parse the receipt";

        let msg = rawMsg;
        // extra guard in case something 503-y still slips through here
        if (
          msg.includes("503 Service Unavailable") ||
          msg.toLowerCase().includes("model is overloaded")
        ) {
          msg =
            "Our receipt reader is temporarily overloaded. Please try again in a moment, or just enter the amount manually.";
        }

        setParseError(msg);
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
    if (isMobile) return; // drag not useful on mobile
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e) {
    if (isMobile) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  async function handleDrop(e) {
    if (isMobile) return;
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
        <div className="flex items-center justify-between gap-2">
          <label className="block text-sm font-medium text-slate-700">
            Receipt (optional)
          </label>
          <span className="text-xs text-slate-500">
            Limit: 2 image parses per day
          </span>
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

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!parsing && !submitting && !isMobile) {
              // desktop: clicking box opens file picker
              fileRef.current?.click();
            }
          }}
          className={[
            "mt-1 rounded-lg border-2 p-4 transition",
            isMobile
              ? "border-slate-300 bg-white"
              : [
                  "cursor-pointer border-dashed active:scale-[0.99]",
                  dragActive
                    ? "border-[#84CC16] bg-[#f5fde9]"
                    : "border-slate-300 bg-white hover:bg-slate-50",
                ].join(" "),
          ].join(" ")}
        >
          {!localImageUrl ? (
            isMobile ? (
              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <button
                  type="button"
                  onClick={() => {
                    if (!parsing && !submitting) fileRef.current?.click();
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm active:scale-[0.99]"
                >
                  <Upload className="h-4 w-4" />
                  Open camera / gallery
                </button>
                <p className="text-xs text-slate-500">
                  We&apos;ll read the total and store name automatically. You
                  can still edit everything before saving.
                </p>
                {parseError && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-rose-700">
                    <AlertCircle className="h-3.5 w-3.5" /> {parseError}
                  </p>
                )}
              </div>
            ) : (
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
                {parseError && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-rose-700">
                    <AlertCircle className="h-3.5 w-3.5" /> {parseError}
                  </p>
                )}
              </div>
            )
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 flex-none overflow-hidden rounded-md ring-1 ring-slate-200">
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
                  {isMobile
                    ? "Tap the button below to replace"
                    : "Click or drop to replace"}
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
                  className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </div>
          )}

          {/* Hidden file input – reused for both desktop + mobile */}
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
