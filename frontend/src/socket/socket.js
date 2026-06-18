import { io } from "socket.io-client";

function resolveSocketUrl() {
  const configured =
    import.meta.env.VITE_SOCKET_URL;

  if (configured) {
    return configured;
  }

  const apiUrl =
    import.meta.env.VITE_API_URL;

  // Docker: API is proxied at /api on same origin
  if (apiUrl?.startsWith("/")) {
    return undefined;
  }

  if (apiUrl) {
    return apiUrl.replace(/\/api\/?$/, "");
  }

  return "http://localhost:5000";
}

const socket = io(resolveSocketUrl(), {
  transports: ["websocket", "polling"],
  autoConnect: true
});

export default socket;
