import { io }
from "socket.io-client";

const socket = io(
  import.meta.env.VITE_SOCKET_URL ||
  undefined
);

export default socket;
