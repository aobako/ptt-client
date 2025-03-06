import EventEmitter from "eventemitter3"
// @ts-ignore: lib types TBA
import Terminal from "terminal.js"
import type { Line, Config, Model, BotState } from "../types/types.js"
import { Socket } from "./socket.js"
import { decode, encode, keymap as key } from "../utils/index.js"
import { substrWidth } from "../utils/char.js"
import { defaultConfig } from "./config.js"
import type { Article } from "../model/article.js"
import type { SelectQueryBuilder } from "../utils/query-builder/SelectQueryBuilder.js"
import type { Board } from "../model/board.js"

export class Bot extends EventEmitter {
  static initialState: BotState = {
    connect: false,
    login: false,
    position: {}
  }
  static forwardEvents = ["message", "error"]

  private _config: Config
  private term: Terminal
  private _state: BotState
  private currentCharset: string
  private socket: Socket
  private preventIdleHandler?: ReturnType<typeof setTimeout>

  get line(): Line[] {
    const lines = []
    for (let i = 0; i < this.term.state.rows; i++) {
      const { str, attr } = this.term.state.getLine(i)
      lines.push({ str, attr: Object.assign({}, attr) })
    }
    return lines
  }

  get screen(): string {
    return this.line.map((line) => line.str).join("\n")
  }

  constructor(config?: Partial<Config>) {
    super()
    this._config = { ...defaultConfig, ...config }
    this.term = new Terminal(this._config.terminal)
    this._state = { ...Bot.initialState }
    this.term.state.setMode("stringWidth", "dbcs")
    this.currentCharset = "big5"

    switch (this._config.protocol.toLowerCase()) {
      case "websocket":
      case "ws":
      case "wss":
        break
      case "telnet":
      case "ssh":
      default:
        throw new Error(`Invalid protocol: ${this._config.protocol}`)
    }

    const socket = new Socket(this._config)
    socket.connect()

    Bot.forwardEvents.forEach((e) => {
      socket.on(e, this.emit.bind(this, e))
    })
    socket
      .on("connect", (...args) => {
        this._state.connect = true
        this.emit("connect", ...args)
        this.emit("stateChange", this.state)
      })
      .on("disconnect", (closeEvent, ...args) => {
        this._state.connect = false
        this.emit("disconnect", closeEvent, ...args)
        this.emit("stateChange", this.state)
      })
      .on("message", (data) => {
        if (this.currentCharset !== this._config.charset && !this.state.login && decode(data, "utf8").includes("登入中，請稍候...")) {
          this.currentCharset = this._config.charset
        }
        const msg = decode(data, this.currentCharset)
        this.term.write(msg)
        this.emit("redraw", this.term.toString())
      })
      .on("error", (err) => {
        console.error("WebSocket connection failed.", err)
      })
    this.socket = socket
  }

  get state(): any {
    return { ...this._state }
  }

  getLine = (n: number) => {
    return this.term.state.getLine(n)
  }

  async getContent(): Promise<Line[]> {
    const lines: Line[] = []

    lines.push(this.line[0])

    let sentPgDown = false
    while (!this.line[23].str.includes("100%") && !this.line[23].str.includes("此文章無內容")) {
      for (let i = 1; i < 23; i++) {
        lines.push(this.line[i])
      }
      await this.send(key.PgDown)
      sentPgDown = true
    }

    const lastLine = lines[lines.length - 1]
    for (let i = 0; i < 23; i++) {
      if (this.line[i].str === lastLine.str) {
        for (let j = i + 1; j < 23; j++) {
          lines.push(this.line[j])
        }
        break
      }
    }

    while (lines.length > 0 && lines[lines.length - 1].str === "") {
      lines.pop()
    }

    if (sentPgDown) {
      await this.send(key.Home)
    }
    return lines
  }

  send(msg: string): Promise<boolean> {
    if (this._config.preventIdleTimeout) {
      this.preventIdle(this._config.preventIdleTimeout)
    }
    return new Promise((resolve, reject) => {
      let autoResolveHandler: NodeJS.Timeout
      const cb = () => {
        clearTimeout(autoResolveHandler)
        resolve(true)
      }
      if (this.state.connect) {
        if (msg.length > 0) {
          this.socket.send(encode(msg, this.currentCharset))
          this.once("message", cb)
          autoResolveHandler = setTimeout(() => {
            this.removeListener("message", cb)
            resolve(false)
          }, this._config.timeout * 10)
        } else {
          resolve(true)
        }
      } else {
        reject()
      }
    })
  }

  preventIdle(timeout: number): void {
    clearTimeout(this.preventIdleHandler)
    if (this.state.login) {
      this.preventIdleHandler = setTimeout(async () => {
        await this.send(key.CtrlU)
        await this.send(key.ArrowLeft)
      }, timeout * 1000)
    }
  }

  async login(username: string, password: string, kick: boolean = true): Promise<boolean> {
    if (this.state.login) {
      return true
    }
    username = username.replace(/,/g, "")
    if (this._config.charset === "utf8") {
      username += ","
    }
    await this.send(`${username}${key.Enter}${password}${key.Enter}`)
    let ret = await this.checkLogin(kick)
    if (ret) {
      const { _state: state } = this
      state.login = true
      state.position = {
        boardname: ""
      }
      this.emit("stateChange", this.state)
    }
    return ret
  }

  async logout(): Promise<boolean> {
    if (!this.state.login) {
      return true
    }
    await this.send(`G${key.Enter}Y${key.Enter}`)
    this._state.login = false
    this.emit("stateChange", this.state)
    this.send(key.Enter)
    return true
  }

  private async checkLogin(kick: boolean): Promise<boolean> {
    if (this.line[21].str.includes("密碼不對或無此帳號")) {
      this.emit("login.failed")
      return false
    } else if (this.line[23].str.includes("請稍後再試")) {
      this.emit("login.failed")
      return false
    } else {
      let state = 0
      while (true) {
        await new Promise((res) => setTimeout(res, 400))
        const lines = this.line
        if (lines[22].str.includes("登入中，請稍候...")) {
          /* no-op */
        } else if (lines[22].str.includes("您想刪除其他重複登入的連線嗎")) {
          if (state === 1) continue
          await this.send(`${kick ? "y" : "n"}${key.Enter}`)
          state = 1
          continue
        } else if (lines[23].str.includes("請勿頻繁登入以免造成系統過度負荷")) {
          if (state === 2) continue
          await this.send(`${key.Enter}`)
          state = 2
        } else if (lines[23].str.includes("您要刪除以上錯誤嘗試的記錄嗎")) {
          if (state === 3) continue
          await this.send(`y${key.Enter}`)
          state = 3
        } else if (lines[23].str.includes("按任意鍵繼續")) {
          await this.send(`${key.Enter}`)
        } else if ((lines[22].str + lines[23].str).toLowerCase().includes("y/n")) {
          console.info(`Unknown login state: \n${this.screen}`)
          await this.send(`y${key.Enter}`)
        } else if (lines[23].str.includes("我是")) {
          break
        } else {
          console.info(`Unknown login state: \n${this.screen}`)
        }
      }
      this.emit("login.success")
      return true
    }
  }

  select<T extends Model>(model: T): T extends typeof Article ? SelectQueryBuilder<Article> : SelectQueryBuilder<Board> {
    return model.select(this) as any // casting any while we can still infer types within return
  }

  async enterIndex(): Promise<boolean> {
    await this.send(`${key.ArrowLeft.repeat(10)}`)
    return true
  }

  get currentBoardname(): string {
    const boardRe = /【(?!看板列表).*】.*《(?<boardname>.*)》/
    const match = boardRe.exec(this.line[0].str)
    if (match?.groups) {
      return match.groups.boardname!
      // wtf is wrong with LoL board??
    } else if (this.line[0].str.includes("LoL")) {
      return "LoL"
    } else {
      return ""
    }
  }

  async enterBoardByName(boardname: string): Promise<boolean> {
    await this.send(`s${boardname}${key.Enter} ${key.Home}${key.End}`)

    if (this.currentBoardname.toLowerCase() === boardname.toLowerCase()) {
      this._state.position.boardname = this.currentBoardname
      this.emit("stateChange", this.state)
      return true
    } else {
      await this.enterIndex()
      return false
    }
  }

  async enterByOffset(offsets: number[] = []): Promise<boolean> {
    let result = true
    offsets.forEach(async (offset) => {
      if (offset === 0) {
        result = false
      }
      if (offset < 0) {
        for (let i = 22; i >= 3; i--) {
          let lastOffset = substrWidth("dbcs", this.line[i].str, 3, 4).trim()
          if (lastOffset.length > 0) {
            offset += +lastOffset + 1
            break
          }
          lastOffset = substrWidth("dbcs", this.line[i].str, 15, 2).trim()
          if (lastOffset.length > 0) {
            offset += +lastOffset + 1
            break
          }
        }
      }
      if (offset < 0) {
        result = false
      }
      if (!result) {
        return
      }
      await this.send(`${offset}${key.Enter.repeat(2)} ${key.Home}${key.End}`)
    })

    if (result) {
      this._state.position.boardname = this.currentBoardname
      this.emit("stateChange", this.state)
      await this.send(key.Home)
      return true
    } else {
      await this.enterIndex()
      return false
    }
  }

  async enterBoardByOffset(offsets: number[] = []): Promise<boolean> {
    await this.send(`C${key.Enter}`)
    return await this.enterByOffset(offsets)
  }

  async enterFavorite(offsets: number[] = []): Promise<boolean> {
    await this.send(`F${key.Enter}`)
    return await this.enterByOffset(offsets)
  }
}

export default Bot
