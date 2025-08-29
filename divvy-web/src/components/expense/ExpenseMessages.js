// components/expense/ExpenseMessages.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TbArrowRight } from "react-icons/tb";

export default function ExpenseMessages({ expenseId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const endpoint = useMemo(
    () => `/api/proxy/messages/expense/${expenseId}`,
    [expenseId]
  );

  async function load() {
    try {
      const res = await fetch(endpoint, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await res.json();
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
    } catch (e) {
      console.error("Load messages failed:", e);
    } finally {
      setLoading(false);
      queueMicrotask(scrollToBottom);
    }
  }

  function scrollToBottom() {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load();
    })();

    const t = setInterval(() => {
      if (!document.hidden) load();
    }, 15000);

    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  async function send() {
    const content = text.trim();
    if (!content || sending) return;

    setSending(true);
    setText("");

    const optimistic = {
      _id: `tmp_${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      sender: { username: "You" },
      optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    queueMicrotask(scrollToBottom);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e) {
      console.error("Send failed:", e);
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      alert("Failed to send message. Please try again.");
      setText(content); // restore draft
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    send();
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <h2 className="text-sm font-semibold text-slate-900">Messages</h2>

      <div
        ref={listRef}
        className="mt-2 max-h-64 overflow-auto space-y-3 pr-1"
        aria-busy={loading ? "true" : "false"}
      >
        {loading ? (
          <div className="text-xs text-slate-500">Loading…</div>
        ) : messages.length ? (
          messages.map((m) => <MessageItem key={m._id} msg={m} />)
        ) : (
          <div className="text-xs text-slate-500">No messages yet.</div>
        )}
      </div>

      {/* Single input with icon button inside */}
      <form onSubmit={onSubmit} className="mt-3">
        <div className="relative">
          <input
            type="text"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-lime-300"
            placeholder="Write a message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={sending}
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={sending || !text.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            <TbArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </section>
  );
}

function MessageItem({ msg }) {
  const name = msg?.sender?.username || msg?.sender?.email || "Unknown";
  const time = msg?.createdAt ? new Date(msg.createdAt).toLocaleString() : "";
  return (
    <div className="text-sm">
      <div className="flex items-baseline gap-2">
        <span className="font-medium text-slate-800">{name}</span>
        <span className="text-xs text-slate-500">{time}</span>
        {msg.optimistic && (
          <span className="text-[10px] text-slate-500">(sending…)</span>
        )}
      </div>
      <div className="text-slate-700 whitespace-pre-wrap">{msg.content}</div>
    </div>
  );
}
