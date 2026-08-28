const express=require('express')
const router=express.Router()
const {addSchema,listSchema,replySchema,removeCommentSchema}=require('../schemas/commentSchema.js')
const {add,list,reply,remove}=require('../handlers/commentHandler.js')
const validateSchema = require('../middleWare/validateSchema')

//添加评论
router.post('/add',validateSchema(addSchema),add)
//获取一级评论
router.get('/list',validateSchema(listSchema),list)
//获取一栋楼的子评论
router.get('/reply',validateSchema(replySchema),reply)
//删除评论
router.post('/remove',validateSchema(removeCommentSchema),remove)
module.exports=router