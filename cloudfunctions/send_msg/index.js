// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

// 云函数入口函数
exports.main = async (event, context) => {
  const db = cloud.database();
  const messages = db.collection('messages');
  let openid;
  if (event.uid) {
    openid = event.uid
  } else {
    openid = cloud.getWXContext().OPENID
  }
  messages.add({
    data: {
      "openid": openid,
      "content": event.content,
      "type": event.type,
      "time": Date.now()
    }
  });
  return
}