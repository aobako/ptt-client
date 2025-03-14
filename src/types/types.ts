import type { Article, Board } from "../index.js"

export type Line = {
  str: string
  attr: object
}

export type Config = {
  name: string
  url: string
  charset: string
  origin: string
  protocol: string
  timeout: number
  blobSize: number
  preventIdleTimeout: number
  terminal: {
    columns: number
    rows: number
  }
  [key: string]: any
}

export type BotState = {
  connect: boolean
  login: boolean
  position: {
    boardname?: string
  }
}

export type Model = typeof Article | typeof Board

export type ArticleStatus = "R:" | "□" | "轉"
