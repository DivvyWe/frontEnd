// src/components/expenses/api.js
"use client";

/**
 * Validate the form and return { errors: string[], warnings: string[] }.
 * Non-blocking notes go in warnings; anything that should block submit goes in errors.
 */
export function validateExpenseForm({
  description,
  amount,
  splitMode, // 'equal' | 'percentage' | 'custom'
  splits, // [{ user, amount?, percentage? }]
  contributors, // [{ user, amount }]
}) {
  const errors = [];
  const warnings = [];

  const amt = Number(amount || 0);
  if (!description?.trim()) errors.push("Description is required.");
  if (!(amt > 0)) errors.push("Amount must be greater than 0.");

  const included = splits?.map((s) => String(s.user)) || [];
  if (included.length === 0) errors.push("Select at least one participant.");

  const contribTotal = +(contributors || [])
    .reduce((s, c) => s + (Number(c.amount) || 0), 0)
    .toFixed(2);
  if (amt > 0 && contribTotal !== +amt.toFixed(2)) {
    errors.push("Contributors total must equal the expense amount.");
  }

  if (splitMode === "percentage") {
    const pct = +(splits || [])
      .reduce((s, sp) => s + (Number(sp.percentage) || 0), 0)
      .toFixed(2);
    if (pct !== 100) errors.push("Percentage splits must total 100%.");
  }

  if (splitMode === "custom") {
    const custom = +(splits || [])
      .reduce((s, sp) => s + (Number(sp.amount) || 0), 0)
      .toFixed(2);
    if (amt > 0 && custom !== +amt.toFixed(2)) {
      errors.push("Custom split amounts must equal the total amount.");
    }
  }

  return { errors, warnings };
}

/**
 * Build final splits for the backend.
 * - equal: convert included users → fixed amount per person
 * - percentage: convert to { user, percentage, amount }
 * - custom: pass { user, amount }
 */
export function buildExpensePayload({
  groupId,
  description,
  amount,
  splitMode,
  splits, // [{ user, amount? , percentage? }] (includes selected users)
  contributors, // [{ user, amount }]
}) {
  const amt = Number(amount || 0);
  const cleanedDesc = description.trim();

  let finalSplits = [];

  if (splitMode === "equal") {
    const included = (splits || []).map((s) => String(s.user));
    const count = included.length || 1;
    // Compute equal share with 2-dec rounding. Last share correction keeps totals exact.
    const share = +(amt / count).toFixed(2);
    let rem = +(amt - share * (count - 1)).toFixed(2);
    finalSplits = included.map((uid, i) => ({
      user: uid,
      amount: i === count - 1 ? rem : share,
    }));
  } else if (splitMode === "percentage") {
    finalSplits = (splits || []).map((s) => {
      const pct = Number(s.percentage || 0);
      const part = +((pct / 100) * amt).toFixed(2);
      return { user: String(s.user), percentage: pct, amount: part };
    });
    // Optional last-row correction to eliminate tiny rounding drift:
    const sum = +finalSplits
      .reduce((s, x) => s + (x.amount || 0), 0)
      .toFixed(2);
    const drift = +(amt - sum).toFixed(2);
    if (Math.abs(drift) >= 0.01 && finalSplits.length > 0) {
      finalSplits[finalSplits.length - 1].amount = +(
        (finalSplits[finalSplits.length - 1].amount || 0) + drift
      ).toFixed(2);
    }
  } else {
    // custom
    finalSplits = (splits || []).map((s) => ({
      user: String(s.user),
      amount: +Number(s.amount || 0).toFixed(2),
    }));
  }

  const finalContribs = (contributors || [])
    .filter((c) => Number(c.amount) > 0)
    .map((c) => ({
      user: String(c.user),
      amount: +Number(c.amount).toFixed(2),
    }));

  return {
    description: cleanedDesc,
    amount: +amt.toFixed(2),
    groupId: groupId || null,
    splitType: splitMode || "equal",
    splits: finalSplits,
    contributors: finalContribs,
  };
}

/**
 * POST create expense via Next proxy.
 * Default endpoint: `/api/proxy/expenses` (map to your backend POST /expenses).
 */
export async function postExpense(
  payload,
  { endpoint = "/api/proxy/expenses", signal } = {}
) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
    signal,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON error body
  }

  if (!res.ok) {
    const message =
      data?.message ||
      data?.error ||
      `Failed to create expense (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  // Backend returns { message, expense } per your controller
  return data?.expense || data;
}

/**
 * Optional OCR adapter (if/when you wire it):
 * Call your backend parse route, e.g., POST /parse-receipt with FormData.
 */
export async function parseReceiptImage(
  file,
  { endpoint = "/api/proxy/parse-receipt", signal } = {}
) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    body: fd,
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || "Failed to parse receipt";
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  // Expecting something like { total, lines, rawText }
  return data;
}
