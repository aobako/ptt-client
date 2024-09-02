import "dotenv/config"
import Ptt from "../src/index"
import { Article } from "../src/sites/ptt/model"
import WebSocket from "ws"

const TEST_AC = process.env.TEST_AC
const TEST_PW = process.env.TEST_PW

if (!TEST_AC || !TEST_PW) throw new Error("missing info")

global.WebSocket = WebSocket

;(async function () {
  const ptt = new Ptt()

  ptt.once("connect", async () => {
    const kickOther = true
    if (!(await ptt.login(TEST_AC, TEST_PW, kickOther))) return

    // get last 20 articles from specific board. the first one is the latest
    let query = ptt.select(Article).where("boardname", "C_Chat")
    let article = await query.get()
    console.log(article)

    await ptt.logout()
  })
})()
