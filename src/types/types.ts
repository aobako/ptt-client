import type { Article, Board } from "../index"

export type Line = {
  str: string
  attr: object
}

export type ObjectLiteral = {
  [key: string]: any
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

export type Model = typeof Article | typeof Board
