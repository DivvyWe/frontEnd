// src/lib/socketClient.js
"use client";

import { io } from "socket.io-client";

let socket;

/** Get (or create) a singleton Socket.IO client. */
export function getSocket() {
  if (socket) return socket;
  const url = process.env.NEXT_PUBLIC_SOCKET_URL || undefined; // same-origin if proxied
  socket = io(url, {
    transports: ["websocket", "polling"],
    autoConnect: false, // we connect only when user enables it
  });
  return socket;
}
