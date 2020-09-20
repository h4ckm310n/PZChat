// miniprogram/pages/chat/chat.js
const db = wx.cloud.database()
const messages = db.collection("messages")
const users = db.collection("users")
const recorder_manager = wx.getRecorderManager()
var inner_audio_context = wx.createInnerAudioContext()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    icon_image: "/icons/image.png",
    icon_video: "/icons/video.png",
    icon_audio: "/icons/audio.png",
    icon_send: "/icons/send2.png",
    icon_audio_play: "/icons/audio_play.png",
    login: false,
    input_text: "",
    nickname: "",
    avatar: "",
    openid: "",
    msgs: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    var that = this
    messages.watch({
      onChange: function(snapshot) {
        var msgs = []
        var promises = []
        var start = 0
        if (snapshot.type == "init") {
          start = 0
          msgs = []
          snapshot.docs.forEach(doc => {
            promises.push(that.findUser(doc.openid))
            msgs.push({content: doc.content, time: doc.time, type: doc.type})
          })
        }
        else {
          msgs = that.data.msgs
          start = msgs.length
          snapshot.docChanges.forEach(docChange => {
            if (docChange.queueType == "enqueue") {
              promises.push(that.findUser(docChange.doc.openid))
              msgs.push({content: docChange.doc.content, time: docChange.doc.time, type: docChange.doc.type})
            }
          })
        }
        Promise.all(promises).then((values) => {
          for (let i=0, j=start; i<values.length; ++i, ++j) {
            let u = values[i]
            msgs[j].nickname = u.nickname
            msgs[j].avatar = u.avatar
          }
          msgs.sort(function(a, b) {return a.time - b.time})
          that.setData({
            'msgs': msgs
          })
        })
      },
      onError: function(err) {
        console.error(err)
      }
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */

  onReady: async function () {
    
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    let user_info = wx.getStorageSync("user_info")
    if (user_info == "") {
      this.setData({login: false})
    } else {
      this.setData({login: true, nickname: user_info.nickname, avatar: user_info.avatar, openid: user_info.openid})
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    inner_audio_context.stop()
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    inner_audio_context.stop()
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  },

  //授权登录
  onGetUserInfo: function (e) {
    let nickname = e.detail.userInfo.nickName
    let avatar = e.detail.userInfo.avatarUrl
    wx.cloud.callFunction({
      name: 'wechat_login',
      data: {
        nickname: nickname,
        avatar: avatar
      }
    }).then(res => {
      let openid = res.result.openid
      wx.setStorage({key: "user_info", data: {nickname: nickname, avatar: avatar, openid: openid}})
      this.onShow()
    })
  },

  onInput: function(e) {
    this.setData({input_text: e.detail.value})
  },

  sendText: function(e) {
    let text = this.data.input_text
    if (text == "")
      return
    wx.cloud.callFunction({
      name: 'check_content',
      data: {
        content: text,
        type: 1
      },
      success: function(res) {
        if (res.result.errCode != 0) {
          wx.showToast({
            title: res.result.errMsg
          })
        } else {
          wx.cloud.callFunction({
            name: 'send_msg',
            data: {
              content: text,
              type: 1
            }
          })
        }
      }
    })
    this.setData({input_text: ""})
  },

  findUser: function (openid) {
    return new Promise ((resolve, reject) => {
      let u = {}
      users.where({_openid: openid}).get()
      .then((res) => {
        if (res.data.length != 0)
          u = {nickname: res.data[0].nickname, avatar: res.data[0].avatar}
        resolve(u)
      })
    })
  },

  chooseImage: function() {
    wx.chooseImage({
      success (res) {
        console.log(res.tempFilePaths)
        res.tempFilePaths.forEach(tempFilePath => {
          wx.getFileSystemManager().readFile({
            filePath: tempFilePath,
            encoding: 'base64',
            success: buffer => {
              console.log(buffer)
              wx.cloud.callFunction({
                name: 'check_content',
                data: {
                  buffer: buffer.data,
                  type: 2
                }
              }).then(res => {
                if (res.result.errCode != 0) {
                  wx.showToast({
                    title: res.result.errMsg
                  })
                } else {
                  let cloud_file = tempFilePath.replace('http://tmp/', '').replace('wxfile://', '')
                  wx.cloud.uploadFile({
                    cloudPath: 'images/' + cloud_file,
                    filePath: tempFilePath,
                    success: res => {
                      console.log(res.fileID)
                      wx.cloud.callFunction({
                        name: 'send_msg',
                        data: {
                          content: res.fileID,
                          type: 2
                        }
                      }) 
                    }
                  })
                }
              })
            }
          })
        })
      }
    })
  },

  chooseVideo: function() {
    wx.chooseVideo({
      success (res) {
        console.log(res.tempFilePath)
        let cloud_file = res.tempFilePath.replace('http://tmp/', '').replace('wxfile://', '')
        console.log(cloud_file)
        wx.cloud.uploadFile({
          cloudPath: 'videos/' + cloud_file,
          filePath: res.tempFilePath,
          success: res => {
            wx.cloud.callFunction({
              name: 'send_msg',
              data: {
                content: res.fileID,
                type: 3
              }
            }) 
          }
        })
      }
    })
  },

  onRecord: function() {
    console.log('start')
    wx.showLoading({
      title: '正在录音……',
      mask: true
    })
    recorder_manager.start()
  },

  endRecord: function() {
    recorder_manager.onStop((res) => {
      console.log(res)
      let cloud_file = res.tempFilePath.replace('http://tmp/', '').replace('wxfile://', '')
      wx.cloud.uploadFile({
        cloudPath: 'audios/' + cloud_file,
        filePath: res.tempFilePath,
        success: ress => {
          wx.cloud.callFunction({
            name: 'send_msg',
            data: {
              content: ress.fileID,
              type: 4
            }
          })
        }
      })
    })
    console.log('end')
    wx.hideLoading()
    recorder_manager.stop()
  },

  playAudio: function(e) {
    console.log(inner_audio_context.paused)
    if (inner_audio_context.paused) {
      console.log("play")
      inner_audio_context.src = e.currentTarget.dataset.url
      inner_audio_context.play()
    } else {
      console.log("stop")
      inner_audio_context.stop()
    }
  }
})
