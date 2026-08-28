const {addComment,commentList,replyList,removeComment}=require('../services/commentService.js')
//添加评论
const add=async (req,res,next)=>{
    try{
        const { articleCode,content,replyId } = req.valid
        const {userId}=req.user
        const result=await addComment(articleCode,content,userId,replyId)
        res.ok('评论成功',result)
    }catch(err){
        next(err)
    }
}
//获取一级评论
const list = async (req, res, next) => {
    try {
        const { articleCode,page,pageSize } = req.valid
        const { userId,userType } = req.user
        const result=await commentList(articleCode,userId,userType,page,pageSize)
        res.ok('获取一级评论成功',result)
    } catch (err) {
        next(err)
    }
}
//获取一栋楼的子评论
const reply= async (req, res, next) => {
    try {
        const { articleCode,rootId,page } = req.valid
        const { userId,userType } = req.user
        const result=await replyList(articleCode,userId,userType,rootId,page)
        res.ok('获取子评论成功',result)
    } catch (err) {
        next(err)
    }
}
//删除评论
const remove= async (req, res, next) => {
    try {
        const { articleCode,commentId } = req.valid
        const { userId,userType } = req.user
        await removeComment(articleCode,userId,userType,commentId)
        res.ok('删除评论成功')
    } catch (err) {
        next(err)
    }
}
module.exports={
    add,
    list,
    reply,
    remove
}