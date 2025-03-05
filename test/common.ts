import Bot from "../src/ptt/bot"

export async function pttClient(username, password) {
  const ptt = new Bot()
  await (() =>
    new Promise((resolve) => {
      ptt.once("connect", resolve)
    }))()
  const ret = await ptt.login(username, password)
  if (!ret) {
    throw "login failed"
  }
  return ptt
}
