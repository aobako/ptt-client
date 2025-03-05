import type { Config } from "../types/types.js"

export const defaultConfig: Config = {
  name: "PTT",
  url: "wss://ws.ptt.cc/bbs",
  charset: "utf8",
  origin: "app://pcman",
  protocol: "websocket",
  timeout: 200,
  blobSize: 1024,
  preventIdleTimeout: 30,
  terminal: {
    columns: 80,
    rows: 24
  }
}
