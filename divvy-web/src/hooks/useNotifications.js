// src/hooks/useNotifications.js
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const API_BASE = "/api/proxy/notifications";

export default function useNotifications(userId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const seen = useRef(new Set());
  const socketRef = useRef(null);
  const pollRef = useRef(null);

  const computeUnread = useCallback(
    (list) => list.reduce((acc, n) => acc + (n.read ? 0 : 1), 0),
    []
  );

  const addIfNew = useCallback((n) => {
    const key = `${n._id || ""}:${n.createdAt || ""}:${n.type || ""}`;
    if (seen.current.has(key)) return false;
    seen.current.add(key);
    setItems((prev) => [n, ...prev].slice(0, 200));
    setUnread((u) => u + (n.read ? 0 : 1));
    return true;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE, { credentials: "include" });
      const j = await res.json();
      const list = Array.isArray(j?.notifications) ? j.notifications : [];
      list.forEach((n) =>
        seen.current.add(`${n._id || ""}:${n.createdAt || ""}:${n.type || ""}`)
      );
      setItems(list);
      setUnread(computeUnread(list));
    } catch {
      setItems([]);
      setUnread(0);
    } finally {
      setLoading(false);
    }
  }, [computeUnread]);

  const markRead = useCallback(async (id) => {
    try {
      await fetch(`${API_BASE}/${id}/read`, {
        method: "POST",
        credentials: "include",
      });
      setItems((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnread((u) => Math.max(0, u - 1));
    } catch {}
  }, []);

  const removeOne = useCallback(async (id) => {
    try {
      await fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setItems((prev) => {
        const removed = prev.find((n) => n._id === id);
        const next = prev.filter((n) => n._id !== id);
        if (removed && !removed.read) setUnread((u) => Math.max(0, u - 1));
        return next;
      });
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/read-all`, {
        method: "POST",
        credentials: "include",
      });
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {}
  }, []);

  // Initial load, focus/visibility refresh, and polling fallback
  useEffect(() => {
    load();
    const onFocus = () => load();
    const onVisibility = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    pollRef.current = setInterval(load, 15000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  // Socket.io only if URL is provided (prevents 404 spam)
  useEffect(() => {
    if (!userId) return;
    const ws = process.env.NEXT_PUBLIC_WS_URL;
    if (!ws) return; // <-- don't connect when URL is missing

    const socket = io(ws, { withCredentials: true });
    socketRef.current = socket;

    const onConnect = () => {
      socket.emit("auth:join", { userId: String(userId) });
      load(); // refresh after (re)connect
    };

    const handleNew = (payload) => {
      const doc = {
        _id:
          payload._id ||
          (globalThis.crypto?.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`),
        message: payload.message || "New activity",
        type: payload.type || "activity",
        createdAt: payload.createdAt || new Date().toISOString(),
        read: payload.read === true ? true : false,
        ...payload,
      };
      addIfNew(doc);
    };

    socket.on("connect", onConnect);
    socket.on("reconnect", onConnect);
    socket.on("notification:new", handleNew);
    socket.on("notification:changed", handleNew);

    return () => {
      socket.off("connect", onConnect);
      socket.off("reconnect", onConnect);
      socket.off("notification:new", handleNew);
      socket.off("notification:changed", handleNew);
      socket.disconnect();
    };
  }, [userId, load, addIfNew]);

  return {
    items,
    unread,
    loading,
    load,
    markRead,
    removeOne,
    markAllRead,
  };
}
