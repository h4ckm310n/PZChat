// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

// 云函数入口函数
exports.main = async (event, context) => {
  const users = cloud.database().collection('users')
  let avatar = 'https://cloud-pzchat-s9c4x-1302859286.tcloudbaseapp.com/none_avatar.png'
  let email = event.email, uid = event.uid
  let c = await users.where({_openid: uid}).count()
  if (c.total == 0) {
    users.add({
      data: {
        "_id": uid,
        "_openid": uid,
        "nickname": email,
        "avatar": avatar
      }
    })
  }
  return {
    e: email,
    u: uid,
    c: c.total
  }
}