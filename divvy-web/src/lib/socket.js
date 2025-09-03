// src/lib/socket.js
import { io } from "socket.io-client";

// Change this to your backend WS URL if different
// If your Next API attaches socket.io at the same origin, this is fine:
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "";

let _socket;

export function getSocket() {
  if (!_socket) {
    _socket = io(WS_URL, {
      withCredentials: true,
      transports: ["websocket"], // prefer ws
    });
  }
  return _socket;
}
