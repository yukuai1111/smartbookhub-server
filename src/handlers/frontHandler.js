const { getUserinfo, changeUserInfo, changePsd, sendMessage, conversationList, conversationDetail, 
    removeConversation, removeUser, removeMessage } = require('../services/frontService.js')
const { createAbortWatcher } = require('../utils/abortHelper.js')
const { createMap, clearMap } = require('../memory/chatMap.js')
const { createStreamResponse } = require('../utils/streamUtils.js')

//获取个人信息
const userinfo = async (req, res, next) => {
    try {
        const { userId } = req.user
        const userinfo = await getUserinfo(userId)
        res.ok('获取用户信息成功', { userinfo })
    } catch (err) {
        next(err)
    }
}
//修改个人信息
const changeUser = async (req, res, next) => {
    try {
        const { userId } = req.user
        const { nickname, signature, phone } = req.valid
        const filename = req.file ? req.file.filename : ''
        const result = await changeUserInfo(userId, nickname, signature, phone, filename)
        res.ok('修改用户成功', result)
    } catch (err) {
        next(err)
    }
}
//修改密码
const changePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.valid
        const { userId } = req.user
        await changePsd(userId, oldPassword, newPassword)
        res.ok('修改密码成功')
    } catch (err) {
        next(err)
    }
}

//发送消息
const send = async (req, res, next) => {
    let signal
    let controller
    let stream
    let userId
    let watcher
    try {
        const { message, conversationId } = req.valid
        const user = req.user
        userId = user.userId
        //创建监听器
        watcher = createAbortWatcher(req, res, '聊天流')
        signal = watcher.signal
        controller = watcher.controller
        createMap(userId, controller)
        //创建流
        stream = createStreamResponse(res)
        //回调函数
        const onChunk = (content) => {
            stream.send({ type: 'onchunk', content })
        }
        const { fullResponse, session_id } = await sendMessage(message, userId, conversationId, onChunk, signal)
        stream.send({ type: 'complete', content: fullResponse, session_id })
        stream.end()
    } catch (err) {
        console.log("聊天失败", err)
        stream.error({ type: "error", msg: err.message || "聊天失败" })
    } finally {
        //清除控制器
        if (controller) clearMap(userId, controller)
        //清除监视器
        watcher?.clearWatcher()
    }
}
//获取会话列表
const list = async (req, res, next) => {
    try {
        const { userId } = req.user
        const result = await conversationList(userId)
        res.ok('获取会话列表成功', result)
    } catch (err) {
        next(err)
    }
}
//获取会话详细
const detail = async (req, res, next) => {
    try {
        const { userId } = req.user
        const { conversationId } = req.valid
        const result = await conversationDetail(userId, conversationId)
        res.ok('获取会话详细成功', result)
    } catch (err) {
        next(err)
    }
}
//删除会话
const deleteConversation = async (req, res, next) => {
    try {
        const { userId } = req.user
        const { conversationId } = req.valid
        const result = await removeConversation(userId, conversationId)
        res.ok('删除会话成功', result)
    } catch (err) {
        next(err)
    }
}
//删除消息
const deleteMessage = async (req, res, next) => {
    try {
        const { userId } = req.user
        const { messageId } = req.valid
        const result = await removeMessage(userId, messageId)
        res.ok('删除消息成功', result)
    } catch (err) {
        next(err)
    }
}

//注销账号
const remove = async (req, res, next) => {
    try {
        const { userId } = req.user
        await removeUser(userId)
        res.ok('注销账号成功')
    } catch (err) {
        next(err)
    }
}
module.exports = {
    userinfo,
    changeUser,
    changePassword,
    send,
    list,
    detail,
    deleteConversation,
    deleteMessage,
    remove
}