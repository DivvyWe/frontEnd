// src/components/expense/AddExpenseForm.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// Sections
import ExpenseBasics from "@/components/expenses/ExpenseBasics";
import ExpenseSplitMode from "@/components/expenses/ExpenseSplitMode";
import ExpenseParticipants from "@/components/expenses/ExpenseParticipants";
import ExpenseSplitsEqual from "@/components/expenses/ExpenseSplitsEqual";
import ExpenseSplitsPercentage from "@/components/expenses/ExpenseSplitsPercentage";
import ExpenseSplitsCustom from "@/components/expenses/ExpenseSplitsCustom";
import ExpenseContributors from "@/components/expenses/ExpenseContributors";
import ExpenseFormErrors from "@/components/expenses/ExpenseFormErrors";
import ExpenseActions from "@/components/expenses/ExpenseActions";
import ExpenseSplitsItems from "@/components/expenses/ExpenseSplitsItems"; // 🆕

// Helpers
const toCents = (v) => Math.round((Number(v) || 0) * 100);
const fromCents = (c) => (Number(c || 0) / 100).toFixed(2);

export default function AddExpenseForm({ groupId }) {
  const router = useRouter();

  // Core fields
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(""); // string input; convert to number on submit
  const amountNum = Number(amount) || 0;

  // Current user (for default contributor)
  const [currentUserId, setCurrentUserId] = useState(null);

  // Group + members
  const [members, setMembers] = useState([]); // [{ _id, username, email, phone, avatar }]
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Participants included in the split
  const [participants, setParticipants] = useState([]); // string[] of userIds

  // Split mode & state for each mode
  const [splitMode, setSplitMode] = useState("equal"); // "equal" | "percentage" | "custom" | "items"
  const [percentages, setPercentages] = useState({}); // { [userId]: number }
  const [customAmounts, setCustomAmounts] = useState({}); // { [userId]: "12.34" }

  // 🆕 Items for item-based split
  const [items, setItems] = useState([]); // [{ id, name, price, assignedTo: [userId] }]

  // Contributors (who paid)
  const [contributors, setContributors] = useState([]); // [{ user, amount }]

  // Receipt parse extras
  const [receiptRawText, setReceiptRawText] = useState("");
  const [receiptImageUrl, setReceiptImageUrl] = useState(null);

  // UX
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  /* Fetch current user (for default contributor) */
  useEffect(() => {
    let abort = false;
    async function loadMe() {
      try {
        const res = await fetch("/api/proxy/auth/me", {
          headers: { Accept: "application/json" },
          credentials: "include",
          cache: "no-store",
        });
        if (res.status === 401) return router.replace("/auth/signin");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Failed to load user");
        if (!abort)
          setCurrentUserId(String(data?.user?._id || data?._id || ""));
      } catch {
        // ignore; just won't prefill
      }
    }
    loadMe();
    return () => {
      abort = true;
    };
  }, [router]);

  /* Load group members */
  useEffect(() => {
    if (!groupId) return;
    let abort = false;

    async function loadMembers() {
      try {
        setLoadingMembers(true);
        const res = await fetch(`/api/proxy/user/groups/${groupId}/members`, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
          cache: "no-store",
        });

        if (res.status === 401) {
          router.replace("/auth/signin");
          return;
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to load members");

        const list = Array.isArray(data?.members) ? data.members : [];
        if (abort) return;

        setMembers(list);

        // Initialize participants to everyone by default
        const ids = list.map((m) => String(m._id));
        setParticipants(ids);

        // Default contributor: current user with current amount (editable)
        if (!contributors.length && currentUserId) {
          const initialAmount =
            amount === "" ? "" : String(Number(amountNum).toFixed(2));
          setContributors([
            { user: String(currentUserId), amount: initialAmount },
          ]);
        }
      } catch (err) {
        if (!abort) setError(err.message || "Failed to fetch group members");
      } finally {
        if (!abort) setLoadingMembers(false);
      }
    }

    loadMembers();
    return () => {
      abort = true;
    };
  }, [groupId, router, currentUserId]); // keep simple; guarded inside

  /* When participants change, drop any assignees for removed participants */
  useEffect(() => {
    setItems((prev) =>
      (prev || []).map((it) => ({
        ...it,
        assignedTo: (it.assignedTo || []).filter((id) =>
          (participants || []).includes(id)
        ),
      }))
    );
  }, [participants]);

  /* Derived checks */
  const hasParticipants = participants.length > 0;

  // Contributors must exactly match total and have at least one row
  const contributorsOk = useMemo(() => {
    if (!amountNum) return false;
    if (!contributors || contributors.length === 0) return false;
    const total = toCents(amountNum);
    const sum = contributors.reduce((s, r) => s + toCents(r.amount), 0);
    return total === sum;
  }, [contributors, amountNum]);

  // Splits validity (incl. items mode)
  const splitsOk = useMemo(() => {
    if (!hasParticipants) return false;
    if (splitMode === "equal") return true;

    if (splitMode === "percentage") {
      const totalPct = participants.reduce(
        (s, id) => s + Number(percentages[id] || 0),
        0
      );
      return Math.abs(totalPct - 100) < 1e-9;
    }

    if (splitMode === "custom") {
      const total = toCents(amountNum);
      const sum = participants.reduce(
        (s, id) => s + toCents(customAmounts[id] || 0),
        0
      );
      return total === sum;
    }

    if (splitMode === "items") {
      if (!items || items.length === 0) return false;
      // every item must have positive price & at least one assignee
      for (const it of items) {
        if (!it) return false;
        if (!Number(it.price) || Number(it.price) <= 0) return false;
        if (!Array.isArray(it.assignedTo) || it.assignedTo.length === 0)
          return false;
      }
      const total = toCents(amountNum);
      const sum = items.reduce((s, it) => s + toCents(it.price), 0);
      return Math.abs(total - sum) <= 1; // allow 1 cent difference
    }

    return false;
  }, [
    splitMode,
    hasParticipants,
    participants,
    percentages,
    customAmounts,
    amountNum,
    items,
  ]);

  const canSubmit =
    !submitting &&
    description.trim().length > 0 &&
    amountNum > 0 &&
    hasParticipants &&
    splitsOk &&
    contributorsOk;

  /* Submit */
  async function onSubmit(e) {
    e?.preventDefault?.();
    setError("");

    try {
      if (!description.trim()) {
        setError("Please enter a description.");
        return;
      }
      if (!amountNum || amountNum <= 0) {
        setError("Please enter a valid amount.");
        return;
      }
      if (!hasParticipants) {
        setError("Please select at least one participant.");
        return;
      }

      // Contributors total == amount
      {
        const total = toCents(amountNum);
        const sum = (contributors || []).reduce(
          (s, r) => s + toCents(r.amount),
          0
        );
        if (sum !== total) {
          setError(
            sum < total
              ? `Contributors are short by $${fromCents(total - sum)}`
              : `Contributors exceed by $${fromCents(sum - total)}`
          );
          return;
        }
      }

      // Split-specific validation
      if (splitMode === "percentage") {
        const totalPct = participants.reduce(
          (s, id) => s + Number(percentages[id] || 0),
          0
        );
        if (Math.abs(totalPct - 100) >= 1e-9) {
          setError("Percentages must total exactly 100%.");
          return;
        }
      }

      if (splitMode === "custom") {
        const total = toCents(amountNum);
        const sum = participants.reduce(
          (s, id) => s + toCents(customAmounts[id] || 0),
          0
        );
        if (sum !== total) {
          setError(
            sum < total
              ? `Custom splits are short by $${fromCents(total - sum)}`
              : `Custom splits exceed by $${fromCents(sum - total)}`
          );
          return;
        }
      }

      if (splitMode === "items") {
        if (!items || items.length === 0) {
          setError(
            "No items available. Parse a receipt first or choose another split type."
          );
          return;
        }

        for (const it of items) {
          if (!it || !Number(it.price) || Number(it.price) <= 0) {
            setError("Each item must have a positive price.");
            return;
          }
          if (!Array.isArray(it.assignedTo) || it.assignedTo.length === 0) {
            setError(
              `Item "${
                it.name || "Item"
              }" must be assigned to at least one person.`
            );
            return;
          }
        }

        const total = toCents(amountNum);
        const sum = items.reduce((s, it) => s + toCents(it.price), 0);
        if (Math.abs(total - sum) > 1) {
          setError(
            "Sum of item prices must match the total (after discounts). Adjust item amounts or the total."
          );
          return;
        }
      }

      setSubmitting(true);

      // Build payload expected by backend
      let splits;
      let payloadItems = undefined;

      if (splitMode === "percentage") {
        splits = participants.map((id) => ({
          user: id,
          percentage: Number(percentages[id] || 0),
        }));
      } else if (splitMode === "custom") {
        splits = participants.map((id) => ({
          user: id,
          amount: Number(customAmounts[id] || 0),
        }));
      } else if (splitMode === "items") {
        // backend will compute splits from items
        splits = [];
        payloadItems = (items || []).map((it) => ({
          name: it.name,
          price: Number(it.price || 0),
          assignedTo: (it.assignedTo || []).map(String),
        }));
      } else {
        // equal => backend derives equal splits when empty
        splits = [];
      }

      const participantIdsArr = (participants || []).map(String);

      const payload = {
        description: description.trim(),
        amount: Number(amountNum),
        groupId: String(groupId || "").trim(),
        splitType: splitMode,
        splits,
        contributors: (contributors || []).map((r) => ({
          user: String(r.user),
          amount: Number(r.amount || 0),
        })),
        // Ensure backend gets selected participants
        participants: participantIdsArr,
        participantIds: participantIdsArr,
        // Items for items split (undefined for other modes)
        items: payloadItems,
        // Receipt extras
        rawReceiptText: receiptRawText || undefined,
        receiptImage: receiptImageUrl || undefined,
      };

      const res = await fetch("/api/proxy/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.replace("/auth/signin");
        return;
      }

      if (!res.ok) {
        throw new Error(data?.message || "Failed to create expense");
      }

      // Success → redirect to group page with cache-buster, then refresh
      const created = data?.expense || data;
      const gid = String(created?.group || groupId || "");
      router.push(`/groups/${gid}?v=${Date.now()}`);
      router.refresh();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* Render */
  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-busy={submitting}>
      <ExpenseFormErrors error={error} onClose={() => setError("")} />

      {/* Basics (with receipt parsing that can prefill description/amount) */}
      <ExpenseBasics
        description={description}
        setDescription={setDescription}
        amount={amount}
        setAmount={setAmount}
        submitting={submitting}
        onReceiptParsed={(data) => {
          // store raw text
          setReceiptRawText(data?.rawText || "");

          // backend returns cloudinaryUrl (not receiptImage)
          setReceiptImageUrl(data?.cloudinaryUrl || data?.receiptImage || null);

          // 🧾 normalise parsed items for item-based split
          if (Array.isArray(data?.items) && data.items.length > 0) {
            const normalised = data.items
              .map((it, idx) => ({
                id:
                  it._id || `${idx}-${(it.name || "Item").slice(0, 24)}-${idx}`,
                name: it.name || `Item ${idx + 1}`,
                price: Number(it.price || 0) || 0,
                assignedTo: [], // user picks later
              }))
              .filter((it) => it.price > 0);

            setItems(normalised);

            // If still on equal mode, gently switch to items
            setSplitMode((mode) => (mode === "equal" ? "items" : mode));
          }

          // prefill description if merchant info available
          if (data?.merchantName) {
            const d = data?.usedDate ? new Date(data.usedDate) : new Date();
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            const formattedDate = `${yyyy}-${mm}-${dd}`;
            setDescription(`${data.merchantName} - ${formattedDate}`);
          }

          // prefill amount if parsed successfully
          if (data?.totalAmount != null) {
            const n = Number(data.totalAmount);
            if (!Number.isNaN(n)) {
              setAmount(n.toFixed(2));
            }
          }
        }}
      />

      {/* Split mode selector */}
      <ExpenseSplitMode
        splitMode={splitMode}
        setSplitMode={setSplitMode}
        disabled={submitting}
      />

      {/* Participants */}
      <ExpenseParticipants
        members={members}
        selectedIds={participants}
        onChangeSelected={setParticipants}
        disabled={submitting || loadingMembers}
      />

      {/* Equal / Percentage / Custom / Items sections */}
      {splitMode === "equal" && (
        <ExpenseSplitsEqual
          amount={amount}
          participantIds={participants}
          members={members}
          disabled={submitting}
        />
      )}

      {splitMode === "percentage" && (
        <ExpenseSplitsPercentage
          amount={amount}
          participantIds={participants}
          members={members}
          percentages={percentages}
          onChangePercentages={setPercentages}
          disabled={submitting}
        />
      )}

      {splitMode === "custom" && (
        <ExpenseSplitsCustom
          amount={amount}
          participantIds={participants}
          members={members}
          customAmounts={customAmounts}
          onChangeCustomAmounts={setCustomAmounts}
          disabled={submitting}
        />
      )}

      {splitMode === "items" && (
        <ExpenseSplitsItems
          amount={amount}
          items={items}
          onChangeItems={setItems}
          participantIds={participants}
          members={members}
          disabled={submitting}
        />
      )}

      {/* Contributors (who paid) */}
      <ExpenseContributors
        totalAmount={amount}
        members={members}
        contributors={contributors}
        onChangeContributors={setContributors}
        disabled={submitting}
        currentUserId={currentUserId}
      />

      {/* Actions */}
      <ExpenseActions
        submitting={submitting}
        canSubmit={canSubmit}
        submitLabel="Create expense"
        cancelLabel="Cancel"
        onSubmit={onSubmit}
        onCancel={() => router.back()}
      />
    </form>
  );
}
