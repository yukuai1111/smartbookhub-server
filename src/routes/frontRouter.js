const express = require('express')
const router = express.Router()
const {userinfo,changeUser,changePassword,send,list,detail,deleteConversation,deleteMessage,remove}=require('../handlers/frontHandler.js')
const {uploadAvatar} = require('../middleWare/upload')
const attachUpload = require('../middleWare/attachUpload') 
const {changeUserInfoSchema,changePasswordSchema,sendSchema,detailSchema,deleteConversationSchema,deleteMessageSchema}=require('../schemas/frontSchema.js')
const validSchema=require('../middleWare/validateSchema.js')
//个人信息
router.get('/userinfo',userinfo)
//修改用户信息
router.put('/changeUser',uploadAvatar.single('avatar'),attachUpload('avatar'),validSchema(changeUserInfoSchema),changeUser)
//修改密码
router.put('/changePassword',validSchema(changePasswordSchema),changePassword)

//发送消息，获取ai消息+创建会话+保存会话+生成标题
router.post('/ai/send',validSchema(sendSchema),send)
//获取对话记录列表
router.get('/ai/list',list)
//获取会话详细
router.get('/ai/detail',validSchema(detailSchema),detail)
//删除会话
router.delete('/ai/deleteConversation',validSchema(deleteConversationSchema),deleteConversation)
//删除一条消息
router.delete('/ai/deleteMessage',validSchema(deleteMessageSchema),deleteMessage)
//注销账号
router.post('/remove', remove)

//暴露路由
module.exports = router