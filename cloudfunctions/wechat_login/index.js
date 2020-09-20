// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  console.log(event);
  const db = cloud.database();
  const users = db.collection('users');
  var g = await users.where({
    _openid: wxContext.OPENID
  }).get()
  if (g.data.length != 0) {
    users.where({
      _openid: wxContext.OPENID
    }).update({
      data: {
        "nickname": event.nickname,
        "avatar": event.avatar
      }
    })
  }
  else
  {
    users.add({
      data: {
        "_id": wxContext.OPENID,
        "_openid": wxContext.OPENID,
        "nickname": event.nickname,
        "avatar": event.avatar,
      }
    })
    .then(ress => {
      console.log(ress);
    })
  }
  return {
    openid: wxContext.OPENID
  }
}