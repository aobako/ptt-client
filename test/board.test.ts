import { beforeAll, afterAll, describe, it, expect } from "vitest"
import { Board } from "../src/index.js"

import { pttClient } from "./common"
import { username, password } from "./config"

describe("Board", () => {
  let ptt
  beforeAll(async () => {
    ptt = await pttClient(username, password)
  })
  afterAll(async () => {
    await ptt.logout()
  })

  describe("get by entry", () => {
    it("should get class list", async () => {
      let boards: Board[] = await ptt.select(Board).where("entry", "class").get()
      expect(boards.length).toBeGreaterThan(0)
    })

    it("should get hot list", async () => {
      let boards: Board[] = await ptt.select(Board).where("entry", "hot").get()
      expect(boards.length).toBeGreaterThan(0)
    })

    it("should get favorite list", async () => {
      let boards: Board[] = await ptt.select(Board).where("entry", "favorite").get()
      expect(boards.length).toBeGreaterThan(0)
    })
  })

  describe("get by prefix", () => {
    it("should get a board list (c_cha)", async () => {
      const prefix = "c_cha"
      let boards: Board[] = await ptt.select(Board).where("prefix", prefix).get()
      expect(boards.length).toBeGreaterThan(0)
      boards.forEach((board) => {
        expect(board.name.toLowerCase().indexOf(prefix.toLowerCase())).toBe(0)
      })
    })

    it("should get a board list with single item (gossipi)", async () => {
      const prefix = "gossipi"
      let boards: Board[] = await ptt.select(Board).where("prefix", prefix).get()
      expect(boards.length).toBe(1)
      expect(boards[0].name).toBe("Gossiping")
    })

    it("should get an empty list (c_chaa)", async () => {
      const prefix = "c_chaa"
      let boards: Board[] = await ptt.select(Board).where("prefix", prefix).get()
      expect(boards.length).toBe(0)
    })
  })
})
