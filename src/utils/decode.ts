// @ts-ignore lib types TBA
import uao from "uao-js"

const decode = (data: number[], charset: string) => {
  let str = ""
  switch (charset) {
    case "utf8":
    case "utf-8":
      str = Buffer.from(data).toString("utf8")
      break
    case "big5":
      str = uao.decodeSync(String.fromCharCode(...data))
      break
    default:
      throw new TypeError(`Unknown charset: ${charset}`)
  }
  return str
}

export default decode
