const Joi = require('joi')
const page = Joi.number().integer().min(1).default(1).optional().messages({
    'number.min': '页码page不能小于1',
    'number.base': '页码page必须是整数'
})
const pageSize = Joi.number().integer().min(10).max(50).default(15).optional().messages({
    'number.min': '每页数量pageSize不能小于10',
    'number.max': '每页数量pageSize不能大于50',
    'number.base': '每页数量pageSize必须是整数'
})
//文章编码
const articleCode = Joi.string().trim().required().messages({
    'string.base': '文章编码articleCode必须是字符串',
    'any.empty': '文章编码articleCode不能为空',
    'any.required': '文章编码articleCode不能为空',
    'string.empty': '文章编码articleCode不能为空',
})
//评论内容
const content = Joi.string().trim().max(300).required().messages({
    'string.base': '评论内容content必须是字符串',
    'any.empty': '评论内容content不能为空',
    'any.required': '评论内容content不能为空',
    'string.empty': '评论内容content不能为空',
})
//回复的评论id
const replyId = Joi.string().trim().optional().allow('').messages({
    'string.base': '回复的评论replyId必须是字符串',
    'any.empty': '回复的评论replyId不能为空',
    'string.empty': '回复的评论replyId不能为空',
})
//根评论id
const rootId = Joi.string().trim().required().messages({
    'string.base': '根评论rootId必须是字符串',
    'any.empty': '根评论rootId不能为空',
    'any.required': '根评论rootId不能为空',
    'string.empty': '根评论rootId不能为空',
})
//评论id
const commentId = Joi.string().trim().required().messages({
    'string.base': '评论commentId必须是字符串',
    'any.empty': '评论commentId不能为空',
    'any.required': '评论commentId不能为空',
    'string.empty': '评论commentId不能为空',
})
//添加评论
const addSchema = Joi.object({
    articleCode,
    content,
    replyId,
})
//获取一级评论
const listSchema = Joi.object({
    page,
    pageSize,
    articleCode
})
//获取一栋楼的子评论
const replySchema = Joi.object({
    articleCode,
    page,
    rootId,
})
//删除评论
const removeCommentSchema = Joi.object({
    articleCode,
    commentId,
})
module.exports = {
    addSchema,
    listSchema,
    replySchema,
    removeCommentSchema
}