import { describe, it, beforeAll, afterAll, expect } from "vitest"
import { Article } from "../src"
import { pttClient } from "./common"
import { username, password } from "./config"

describe("Article", () => {
  let ptt
  beforeAll(async () => {
    ptt = await pttClient(username, password)
  })
  afterAll(async () => {
    await ptt.logout()
  })

  describe("get", () => {
    let articles
    const boardname = "Gossiping"
    it("should get correct article list from board", async () => {
      articles = await ptt.select(Article).where("boardname", boardname).get()
      expect(articles.length).toBeGreaterThan(0)
    })
    it('should get correct article list with "id" argument', async () => {
      const articles2 = await ptt
        .select(Article)
        .where("boardname", boardname)
        .where("id", articles[articles.length - 1].id - 1)
        .get()

      expect(articles2[0].id).toBe(articles[articles.length - 1].id - 1)
    })
  })

  describe("getOne", () => {
    const boardname = "Gossiping"
    it("should get correct article from board", async () => {
      const article = await ptt.select(Article).where("boardname", boardname).where("id", 100000).getOne()

      expect(article.boardname).toBe(boardname)
      expect(article.id).toBe(100000)
    })
  })

  describe("where", () => {
    const board = "Gossiping"
    const push = "50"
    const title = "問卦"
    const author = "kevin"

    it("should get correct articles with specified push number from board", async () => {
      const articles = await ptt.select(Article).where("boardname", board).where("push", push).get()
      expect(articles.length).toBeGreaterThan(0)

      articles.forEach((article) => {
        const pushNumber = article.push === "爆" ? "100" : article.push
        expect(Number(pushNumber)).toBeGreaterThanOrEqual(Number(push))
      })
    })

    it("should get correct articles with specified author name from board", async () => {
      const articles = await ptt.select(Article).where("boardname", board).where("author", author).get()
      expect(articles.length).toBeGreaterThan(0)

      articles.forEach((article) => {
        expect(article.author.toLowerCase()).toContain(author.toLowerCase())
      })
    })

    it("should get correct articles containing specified title word from board", async () => {
      const articles = await ptt.select(Article).where("boardname", board).where("title", title).get()
      expect(articles.length).toBeGreaterThan(0)

      articles.forEach((article) => {
        expect(article.title.toLowerCase()).toContain(title)
      })
    })

    it("should get correct articles containing specified title word AND push number from board", async () => {
      const articles = await ptt.select(Article).where("boardname", board).where("title", title).where("push", push).get()
      expect(articles.length).toBeGreaterThan(0)

      articles.forEach((article) => {
        const pushNumber = article.push === "爆" ? "100" : article.push
        expect(article.title.toLowerCase()).toContain(title)
        expect(Number(pushNumber)).toBeGreaterThanOrEqual(Number(push))
      })
    })
  })
})
