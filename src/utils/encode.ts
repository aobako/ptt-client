// @ts-ignore lib types TBA
import uao from "uao-js"

const encode = (str: string, charset: string) => {
  let buffer
  switch (charset) {
    case "utf8":
    case "utf-8":
      buffer = Buffer.from(str, "utf8")
      break
    case "big5":
      buffer = Buffer.from(uao.encodeSync(str), "binary")
      break
    default:
      throw new TypeError(`Unknown charset: ${charset}`)
  }
  return buffer
}

export default encode
