// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case 1:
      try {
        let sec = await cloud.openapi.security.msgSecCheck ({
          content: event.content
        })
        if (sec.errCode != 0)
          return {errCode: sec.errCode, errMsg: sec.errMsg}
      } catch (err) {
        console.log(err)
        return {errCode: -1, errMsg: err}
      }
      break;
    case 2:
      try {
        let sec = await cloud.openapi.security.imgSecCheck ({
          media: {
            contentType: 'image/*',
            value: Buffer.from(event.buffer, 'base64')
          }
        })
        if (sec.errCode != 0)
          return {errCode: sec.errCode, errMsg: sec.errMsg}
      } catch (err) {
        console.log(err)
        return {errCode: -1, errMsg: err}
      }
      break;
    default:
      break;
  }
  return {errCode: 0}
}