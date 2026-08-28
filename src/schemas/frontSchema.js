const Joi = require('joi')
//昵称校验
const nickname = Joi.string().trim().min(1).max(10).optional().messages({
    'string.min': '昵称长度不能小于1位',
    'string.max': '昵称长度不能大于10位',
    'string.empty': '昵称nickname不能为空',
    'string.base': '昵称必须是字符串',
})
//签名校验
const signature = Joi.string().trim().min(1).max(100).optional().messages({
    'string.min': '签名长度不能小于1位',
    'string.max': '签名长度不能大于100位',
    'string.empty': '签名signature不能为空',
    'string.base': '签名必须是字符串',
})
//手机号校验
const phone = Joi.string().trim().pattern(/^1[3456789]\d{9}$/).optional().messages({
    'string.min': '手机号长度不能小于11位',
    'string.max': '手机号长度不能大于11位',
    'string.base': '手机号必须是字符串',
    'string.pattern.base': '手机号格式错误',
    'string.empty': '手机号phone不能为空',
})
//密码校验
const password = Joi.string().trim().min(6).max(15).pattern(/^[a-zA-Z0-9_@]+$/).required()

//消息校验
const message=Joi.string().trim().min(1).max(200).required().messages({
    'string.min': '消息长度不能小于1位',
    'string.max': '消息长度不能大于200位',
    'string.empty': '消息不能为空',
    'string.base': '消息必须是字符串',
    'any.required': '消息不能为空',
})
//会话id校验
const conversationId=Joi.string().trim().optional().messages({
    'string.empty': '会话conversationId不能为空',
    'string.base': '会话conversationId必须是字符串',
})
//消息id校验
const messageId=Joi.number().integer().required().messages({
    'number.empty': '消息messageId不能为空',
    'number.base': '消息messageId必须是整数数字',
    'any.required': '消息messageId不能为空',
})
//获取会话详细校验
const sessionId=Joi.string().trim().required().messages({
    'string.empty': '会话conversationId不能为空',
    'string.base': '会话conversationId必须是字符串',
    'any.required': '会话conversationId不能为空',
})
//修改用户信息校验
const changeUserInfoSchema = Joi.object({
    nickname,
    signature,
    phone
})
//修改密码校验
const changePasswordSchema = Joi.object({
    oldPassword: password.messages({
        'string.min': '旧密码oldPassword长度不能小于6位',
        'string.max': '旧密码oldPassword长度不能大于15位',
        'any.required': '旧密码oldPassword不能为空',
        'string.empty': '旧密码oldPassword不能为空',
        'string.base': '旧密码oldPassword必须是字符串',
        'string.pattern.base': '旧密码oldPassword只能包含大小写字母、数字、下划线和@符号',
    }),
    newPassword: password.messages({
        'string.min': '新密码newPassword长度不能小于6位',
        'string.max': '新密码newPassword长度不能大于15位',
        'any.required': '新密码newPassword不能为空',
        'string.empty': '新密码newPassword不能为空',
        'string.base': '新密码newPassword必须是字符串',
        'string.pattern.base': '新密码newPassword只能包含大小写字母、数字、下划线和@符号',
    }),
    confirmPassword: password.concat(Joi.any().valid(Joi.ref('newPassword')).messages({
        'any.required': '确认密码confirmPassword不能为空',
        'any.only': '两次密码不一致'
    }))
})

//发送消息校验
const sendSchema=Joi.object({
    message,
    conversationId
})
//获取会话详细校验
const detailSchema=Joi.object({
    conversationId:sessionId
})
//删除会话校验
const deleteConversationSchema=Joi.object({
    conversationId:sessionId
})
//删除一条消息校验
const deleteMessageSchema=Joi.object({
    messageId:messageId
})
module.exports = {
    changeUserInfoSchema,
    changePasswordSchema,
    sendSchema,
    detailSchema,
    deleteConversationSchema,
    deleteMessageSchema
}
