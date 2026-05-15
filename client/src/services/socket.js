import { io } from "socket.io-client";

const SERVER_URL = window.location.hostname === "localhost" ? "http://localhost:3001" : window.location.origin;
export const socket = io(SERVER_URL);
