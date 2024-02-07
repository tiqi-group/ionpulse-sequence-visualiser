import { io } from "socket.io-client";
import settings from "../settings";

const URL = `ws://${settings["Library ip"]}:${settings["Library port"]}`;

export const socket = io(URL, {
  path: "/ws/socket.io/",
});
