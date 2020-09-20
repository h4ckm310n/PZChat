const app = cloudbase.init({
    env: "cloud-pzchat-s9c4x"
});

const auth = app.auth({persistence: 'local'});
var MSGS = [];
const db = app.database();
var users = db.collection("users");
var messages = db.collection("messages");


auth.getLoginState().then((res) => {
    if (res == null) {
        $('#input').html('<button class="btn login_btn" onclick="modalShow()">点击登录</button>');
    }
    else {
        var input_html =
            '<div><textarea class="textarea" cols="197" rows="2" id="textarea"></textarea></div>' +
            '<div style="margin-top: 10px"><img class="icon" src="icons/image.png" onclick="chooseImage()">' +
            '<input type="file" id="input_img" multiple="multiple" accept="image/*" hidden="hidden" onchange="sendImage()">' +
            '<img class="icon" src="icons/video.png" onclick="chooseVideo()">' +
            '<input type="file" id="input_video" multiple="multiple" accept="video/*" hidden="hidden" onchange="sendVideo()">' +
            '<img class="icon" src="icons/send2.png" onclick="sendText()" style="float: right"></div>'
        $('#input').html(input_html);
    }
    msgsWatch();
});

function msgsWatch() {
    messages.where({}).watch({
        onChange: (snapshot) => {
            console.log(MSGS);
            var msgs = [];
            var promises = [];
            var start = 0;
            if (snapshot.msgType == "INIT_EVENT") {
                start = 0;
                msgs = [];
                snapshot.docs.forEach(doc => {
                    promises.push(findUser(doc.openid));
                    msgs.push({content: doc.content, time: doc.time, type: doc.type});
                })
            }
            else {
                msgs = MSGS;
                start = msgs.length;
                snapshot.docChanges.forEach(docChange => {
                    if (docChange.queueType == "enqueue") {
                        promises.push(findUser(docChange.doc.openid));
                        msgs.push({content: docChange.doc.content, time: docChange.doc.time, type: docChange.doc.type});
                    }
                })
            }
            Promise.all(promises).then((values) => {
                for (let i=0, j=start; i<values.length; ++i, ++j) {
                    let u = values[i];
                    msgs[j].nickname = u.nickname;
                    msgs[j].avatar = u.avatar;
                }
                msgs.sort(function(a, b) {return a.time - b.time});
                MSGS = msgs;
                console.log(MSGS)
                $('#chat_box').html('');
                let res_promises = [];
                MSGS.forEach(msg => {
                    res_promises.push(getTempFileURL(msg.content, msg.type))
                })
                Promise.all(res_promises).then((valuess) => {
                    for (let i=0; i<valuess.length; ++i) {
                        newMsgItem(MSGS[i], valuess[i]);
                    }
                })
            })
        },
        onError: (err) => {
            console.error(err);
        }
    })
}

function findUser(openid) {
    return new Promise ((resolve, reject) => {
        let u = {};
        users.where({'_openid': openid}).get()
        .then((res) => {
            if (res.data.length != 0)
                u = {nickname: res.data[0].nickname, avatar: res.data[0].avatar}
            resolve(u)
        })
    })
}

function newMsgItem(msg, c) {
    let avatar = '<img src="' + msg.avatar + '" class="chat_avatar">';
    let nickname = '<div class="chat_nickname">' + msg.nickname + '</div>';
    let content_type;
    switch (msg.type) {
        case 1:
            content_type = '<a class="chat_text">' + msg.content + '</a>';
            break;
        case 2:
            content_type = '<img width="300" src="' + c + '">';
            break;
        case 3:
            content_type = '<video width="300" controls><source src="' + c + '"></video>';
            break;
        case 4:
            content_type = '<audio controls><source src="' + c + '"></audio>';
            break;
        default:
            break;
    }
    let content = '<div class="chat_content">' + content_type + '</div>';
    let msg_item = '<div class="chat_item">' + avatar + nickname + content + '</div>';
    $('#chat_box').append(msg_item);
}

function getTempFileURL(src, type) {
    return new Promise((resolve, reject) => {
        if (type == 1)
            resolve(src);
        else {
            app.getTempFileURL({
                fileList: [src]
            }).then((res) => {
                resolve(res.fileList[0].tempFileURL);
            })
        }
    })
}

function modalShow() {
    $('#email').val('');
    $('#password').val('');
    $('#confirm_password').val('');
    $('#btn_reset').attr('hidden', 'hidden');
    $('#div_password').removeAttr('hidden');
    $('#btn_sign').removeAttr('hidden');
    $('#btn_sign').attr('onclick', 'onSignIn()');
    $('#btn_sign').text('登录');
    $('#change_sign').text('注册账号');
    $('#div_confirm_password').attr('hidden', 'hidden');
    $('#forget_password').removeAttr('hidden');
    $('#signin_modal').modal('show');
}

function changeSign() {
    $('#email').val('');
    $('#password').val('');
    $('#confirm_password').val('');
    $('#btn_reset').attr('hidden', 'hidden');
    $('#div_password').removeAttr('hidden');
    $('#btn_sign').removeAttr('hidden');

    if ($('#btn_sign').attr('onclick') == 'onSignIn()') {
        $('#btn_sign').attr('onclick', 'onSignUp()');
        $('#btn_sign').text('注册');
        $('#change_sign').text('已有账号，登录');
        $('#div_confirm_password').removeAttr('hidden');
        $('#forget_password').attr('hidden', 'hidden');
    }
    else {
        $('#btn_sign').attr('onclick', 'onSignIn()');
        $('#btn_sign').text('登录');
        $('#change_sign').text('注册账号');
        $('#div_confirm_password').attr('hidden', 'hidden');
        $('#forget_password').removeAttr('hidden');
    }
}

function forgetPassword() {
    $('#email').val('');
    $('#password').val('');
    $('#confirm_password').val('');
    $('#div_confirm_password').attr('hidden', 'hidden');
    $('#div_password').attr('hidden', 'hidden');
    $('#btn_sign').attr('hidden', 'hidden');
    $('#btn_reset').removeAttr('hidden');
}

function resetPassword() {
    auth.sendPasswordResetEmail($('#email').val()).then(() => {
        alert('已发送密码重置邮件');
        window.location.href = 'index.html';
    }).catch((err) => {
        console.error(err);
        alert('账户不存在');
    });
}

function onSignIn() {
    let email = $('#email').val();
    let password = $('#password').val();
    auth.signInWithEmailAndPassword(email, password).then((state) => {
        console.log(state);
        let uid = state.user.uid;
        app.callFunction({
            name: 'email_login',
            data: {
                email: email,
                uid: uid
            }
        }).then((res) => {
            console.log(res);
            window.location.href = 'index.html';
        });
    }).catch((err) => {
        console.error(err);
        if (err.toString().includes('account auth fail'))
            alert('邮箱或密码错误');
        else if (err.toString().includes('mail user not exist'))
            alert('账号不存在');
        else
            alert('未知错误');
    })
}

function onSignUp() {
    let email = $('#email').val();
    let password = $('#password').val();
    let confirm = $('#confirm_password').val();
    if (confirm != password) {
        alert('两次密码输入内容不一致！');
        return;
    }
    auth.signUpWithEmailAndPassword(email, password).then(() => {
            alert('验证邮件已发送，请在2小时内点击验证链接');
            window.location.href = 'index.html';
    }).catch((err) => {
        console.error(err);
        if (err.toString().includes('mail addr is invalid'))
            alert('无效的邮箱地址');
        else if (err.toString().includes('mail user exist'))
            alert('该邮箱已被注册！');
        else if (err.toString().includes('pwd length too short'))
            alert('密码设置过于简单');
        else
            alert('未知错误');
    })
}

function chooseImage() {
    $('#input_img').click();
}

function sendImage() {
    let files = $('#input_img')[0].files;
    console.log(files);
    for (var i=0; i<files.length; ++i) {
        var file = files[i];
        app.uploadFile({
            cloudPath: 'images/' + auth.currentUser.uid + '_' + Date.now().toString() + '_' + file.name,
            filePath: file
        }).then((res) => {
            console.log(res.fileID);
            app.callFunction({
                name: 'send_msg',
                data: {
                    uid: auth.currentUser.uid,
                    content: res.fileID,
                    type: 2
                }
            });
        })
    }
    $('#input_img').val('');
}

function chooseVideo() {
    $('#input_video').click();
}

function sendVideo() {
    let files = $('#input_video')[0].files;
    console.log(files);
    for (var i=0; i<files.length; ++i) {
        var file = files[i];
        app.uploadFile({
            cloudPath: 'videos/' + auth.currentUser.uid + '_' + Date.now().toString() + '_' + file.name,
            filePath: file
        }).then((res) => {
            console.log(res.fileID);
            app.callFunction({
                name: 'send_msg',
                data: {
                    uid: auth.currentUser.uid,
                    content: res.fileID,
                    type: 3
                }
            });
        })
    }
    $('#input_video').val('');
}

function sendText() {
    let text = $('#textarea').val();
    $('#textarea').val('');
    app.callFunction({
        name: 'send_msg',
        data: {
            uid: auth.currentUser.uid,
            content: text,
            type: 1
        }
    });
}