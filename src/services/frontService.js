const BusinessError = require('../utils/errorHandler.js')
const { pool } = require('../mysql/mysql.js')
const path = require('path')
const fs = require('fs')
const bcrypt = require('bcryptjs')
const generateCode = require('../utils/generateCode.js')
const { createStream, generateTitle } = require('../utils/llmUtils.js')
const { clearMapAll } = require('../memory/chatMap.js')
const { isAbortError } = require('../utils/abortHelper.js')
require('dotenv').config()
//获取用户信息
const getUserinfo = async (userId) => {
    //获取用户
    const [userResult] = await pool.query(
        `select 
        id,
        username,
        nickname,
        signature,
        phone,
        create_time,
        avatar
        from users 
        where id=?`, [userId])
    if (userResult.length === 0) throw new BusinessError('用户不存在')
    const user = userResult[0]
    user.create_time = user.create_time.getTime()
    return user
}
//修改用户信息
const changeUserInfo = async (userId, nickname, signature, phone, filename) => {
    const [userResult] = await pool.query('select id,avatar,phone,nickname from users where id=?', [userId])
    if (userResult.length === 0) throw new BusinessError('用户不存在')
    const user = userResult[0]
    //要修改的信息
    const changeData = {}
    if (nickname !== undefined) {
        changeData.nickname = nickname
    } else {
        changeData.nickname = user.nickname
    }
    if (signature !== undefined) {
        changeData.signature = signature
    }
    if (phone !== undefined) {
        //判断手机号是否重复
        const [phoneResult] = await pool.query('select id from users where id!=? and phone=? limit 1', [userId, phone])
        if (phoneResult.length !== 0) throw new BusinessError('手机号已存在')
        changeData.phone = phone
    } else {
        changeData.phone = user.phone
    }
    //判断是否有新头像
    let newAvatar = user.avatar
    if (filename) {
        //有新头像，清除旧头像
        //判断旧头像是否是默认头像
        if (user.avatar !== '/images/avatar/default.jpg') {
            const oldFilePath = path.join(__dirname, '../../public', user.avatar)
            try {
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath)
                }
            } catch (err) {
                console.log('删除旧头像文件失败', err)
            }
        }
        //新头像
        newAvatar = `/images/avatar/${filename}`
        changeData.avatar = newAvatar
    }
    //判断更新信息里有没有数据，没有就直接返回
    if (Object.keys(changeData).length === 0) return
    //有就更新
    const [updateResult] = await pool.query('update users set ? where id=?', [changeData, userId])
    if (updateResult.affectedRows === 0) throw new BusinessError('修改用户信息失败')
    return {
        userId,
        avatar: newAvatar,
        nickname: changeData.nickname,

    }
}
//修改密码
const changePsd = async (userId, oldPassword, newPassword) => {
    //查找密码
    const [userResult] = await pool.query('select id,password from users where id=?', [userId])
    if (userResult.length === 0) throw new BusinessError('用户不存在')
    const oldPsd = userResult[0].password
    //判断旧密码是否正确
    const isMatch = bcrypt.compareSync(oldPassword, oldPsd)
    if (!isMatch) throw new BusinessError('密码错误')
    //判断新密码是否与旧密码不同
    if (oldPassword === newPassword) throw new BusinessError('新密码不能与旧密码相同')
    //更新密码
    const newPsd = bcrypt.hashSync(newPassword, 10)
    const [updateResult] = await pool.query('update users set password=?,token_version=token_version+1 where id=?', [newPsd, userId])
    if (updateResult.affectedRows === 0) throw new BusinessError('修改密码失败')
}

//创建会话
const createConversation = async (userId, conn) => {
    //会话id
    let conversationId
    let retry = 10
    while (retry > 0) {
        retry--
        conversationId = generateCode()
        //判断会话id是否重复
        const [conversationResult] = await conn.query('select id from conversations where id=?', [conversationId])
        if (conversationResult.length === 0) break
    }
    if (retry <= 0) throw new BusinessError('创建会话失败')
    //创建
    const [createResult] = await conn.query('insert into conversations (id,user_id) values (?,?)', [conversationId, userId])
    if (createResult.affectedRows === 0) throw new BusinessError('创建会话失败')
    return conversationId
}

//保存用户消息（状态已完成）
const saveUserMessage = async (conversationId, message, role, conn) => {
    //插入记录表
    const [insertResult] = await conn.query('insert into chat_records (conversation_id,content,role,status) values (?,?,?,?)', [conversationId, message, role, 2])
    if (insertResult.affectedRows === 0) throw new BusinessError('保存用户消息失败')
    //更新会话结束时间
    const [updateResult] = await conn.query('update conversations set end_time=? where id=?', [new Date(), conversationId])
    if (updateResult.affectedRows === 0) throw new BusinessError('更新会话结束时间失败')
    const [row] = await conn.query(`
         select 
         id message_id,
         role,
         content message,
         create_time send_time
         from chat_records
         where id = ?
     `, [insertResult.insertId])
    if (!row[0]) return null
    return {
        ...row[0],
        send_time: row[0].send_time.getTime()
    }
}
//创建空的AI消息（状态生成中，只返回消息id，不返回内容）
const createEmptyAiMessage = async (conversationId, conn) => {
    //插入记录表
    const [insertResult] = await conn.query('insert into chat_records (conversation_id,content,role,status) values (?,?,?,?)', [conversationId, '', 'assistant', 1])
    if (insertResult.affectedRows === 0) throw new BusinessError('创建空的AI消息失败')
    //更新会话时间
    const [updateResult] = await conn.query('update conversations set end_time=? where id=?', [new Date(), conversationId])
    if (updateResult.affectedRows === 0) throw new BusinessError('更新会话结束时间失败')
    return insertResult.insertId
}
//不断追加AI消息（状态生成中）
const appendAiMessage = async (messageId, appendContent) => {
    if (!appendContent) return
    const [updateResult] = await pool.query('update chat_records set content=concat(content,?) where id=?', [appendContent, messageId])
    if (updateResult.affectedRows === 0) throw new BusinessError('追加AI消息失败')
}
//完成Ai消息（状态已完成）
const finishAiMessage = async (messageId) => {
    const [updateResult] = await pool.query(`
        update chat_records set status=2,content=if(content='','Ai异常，未返回内容',content) where id=?`, [messageId])
    if (updateResult.affectedRows === 0) throw new BusinessError('完成AI消息失败')
}
//中断Ai消息（状态被中断）
const abortAiMessage = async (messageId) => {
    const [updateResult] = await pool.query(`
        update chat_records set status=3,content=if(content='','用户手动切断，还未返回内容',content) where id=?`, [messageId])
    if (updateResult.affectedRows === 0) throw new BusinessError('中断标记AI消息失败')
}

//发送消息，获取ai消息+创建会话+保存会话+生成标题
const sendMessage = async (message, userId, conversationId, streamCallback, signal) => {
    let messages   //所有要传给ai的聊天记录
    let conn
    let newRecord = null
    let aiMessageId = null  //ai消息id（后期要追加）
    try {
        conn = await pool.getConnection()
        await conn.beginTransaction()
        if (conversationId) {
            //有会话id：旧对话（判断是否存在）
            const [conversationResult] = await conn.query('select id from conversations where id=?', [conversationId])
            if (conversationResult.length === 0) throw new BusinessError('会话不存在')

        } else {
            //没有会话id:创建新会话
            conversationId = await createConversation(userId, conn)
        }
        //保存当前用户消息
        newRecord = await saveUserMessage(conversationId, message, 'user', conn)
        //创建一个新的Ai空消息
        aiMessageId = await createEmptyAiMessage(conversationId, conn)
        //每次发给ai的消息不超过8条
        const [messagesResult] = await conn.query('select id,content,role,create_time from chat_records where conversation_id=? order by create_time asc', [conversationId])
        //对会话进行截取，只取后8条
        messages = messagesResult.slice(-8)
        messages = messages.map(item => {
            return {
                role: item.role,
                content: item.content
            }
        })
        await conn.commit()
    } catch (err) {
        await conn.rollback()
        throw err
    } finally {
        conn.release()
    }
    //立马把会话id返回，防止要是ai没回复完，用户又发了消息，导致会话id不一致
    streamCallback({
        type: 'conv_id',
        session_id: conversationId,
        user_msg: newRecord,
        ai_msgId: aiMessageId
    })
    const aiMessages = []  //要给ai的消息
    //全局提示词
    const prompt =`你是智能知识库助手，回答风格轻松活泼，语气亲切自然，可以适当使用表情符号，支持简单分点，不要复杂markdown。全部使用中文回答。请结合本次对话的上下文历史理解用户问题，连贯完整地进行回复，不要割裂对话。严禁编造虚假信息，拒绝回答违法违规内容。`
    //增加提示词
    aiMessages.push({
        role: 'system',
        content: prompt
    })
    //追加聊天记录
    aiMessages.push(...messages)
    //把aiMessages给ai，获取ai的回复
    let fullResponse = null
    //包一层onChunk，传给createStream，用于打字机效果+数据库追加
    const onChunk = async (content) => {
        //传给前端
        streamCallback(content)
        if (!content) return
        //追加数据库
        await appendAiMessage(aiMessageId, content).catch(err => {
            console.log('追加AI消息失败', err)
        })
    }
    try {
        fullResponse = await createStream(aiMessages, onChunk, signal)
    } catch (err) {
        if (isAbortError(err)) {
            const title = message.trim().length > 12 ? message.trim().slice(0, 12) : message.trim()
            try {
                //中断标记ai消息
                await abortAiMessage(aiMessageId)
                await pool.query('update conversations set title=? where id=?', [title, conversationId])
            } catch (err) {
                console.log('更新标题失败', err)
            }
            fullResponse = null
        } else {
            throw err
        }
    }
    if (!fullResponse) return { session_id: conversationId, fullResponse: null }

    //生成标题
    const [conversationResult] = await pool.query('select title from conversations where id=?', [conversationId])
    if (conversationResult.length === 0) return console.log('会话不存在')
    if (conversationResult[0].title === '新对话') {
        await generateTitle(message, fullResponse, signal).then(async title => {
            let finalTitle = title
            if (!finalTitle) {
                finalTitle = fullResponse?.trim().slice(0, 12) || 'AI对话记录'
            }
            //更新数据
            await pool.query('update conversations set title=? where id=?', [finalTitle, conversationId])
        }).catch(async err => {
            console.log('生成标题失败', err)
            const finalTitle = fullResponse?.trim().slice(0, 12) || 'AI对话记录'
            //更新数据
            await pool.query('update conversations set title=? where id=?', [finalTitle, conversationId])
        })
    }
    //保存AI记录
    await finishAiMessage(aiMessageId)
    return { session_id: conversationId, fullResponse }
}
//获取会话列表
const conversationList = async (userId) => {
    const [conversationResult] = await pool.query('select id,title,start_time,end_time from conversations where user_id=? order by start_time desc', [userId])
    const conversationList = conversationResult.map(item => {
        return {
            ...item,
            start_time: item.start_time.getTime(),
            end_time: item.end_time.getTime()
        }
    })
    return { size: conversationResult.length, conversationList }
}
//获取会话详情
const conversationDetail = async (userId, conversationId) => {
    const [conversationResult] = await pool.query('select id,user_id,title from conversations where id=?', [conversationId])
    if (conversationResult.length === 0) throw new BusinessError('会话不存在')
    if (conversationResult[0].user_id !== userId) throw new BusinessError('您没有权限查看该会话', 403)
    const [messagesResult] = await pool.query(`
    select 
    id message_id,
    role,
    status,
    content message,
    create_time send_time
    from chat_records m
    where conversation_id=?
    order by create_time asc
    `, [conversationId])
    const messages = messagesResult.map(item => {
        return {
            ...item,
            send_time: item.send_time.getTime()
        }
    })
    return { size: messages.length, messages, title: conversationResult[0].title, session_id: conversationResult[0].id }
}
//删除会话记录
const removeConversation = async (userId, conversationId) => {
    const [conversationResult] = await pool.query('select id,user_id,title from conversations where id=?', [conversationId])
    if (conversationResult.length === 0) throw new BusinessError('会话不存在')
    if (conversationResult[0].user_id !== userId) throw new BusinessError('您没有权限查看该会话', 403)
    const [deleteResult] = await pool.query('delete from conversations where id=?', [conversationId])
    if (deleteResult.affectedRows === 0) throw new BusinessError('删除会话失败')
    return { title: conversationResult[0].title }
}
//删除消息
const removeMessage = async (userId, messageId) => {
    const [messageResult] = await pool.query('select id,conversation_id,status from chat_records where id=?', [messageId])
    if (messageResult.length === 0) throw new BusinessError('消息不存在')
    const message = messageResult[0]
    const [conversationResult] = await pool.query('select user_id from conversations where id=?', [message.conversation_id])
    if (conversationResult.length === 0) throw new BusinessError('会话不存在')
    const conversation = conversationResult[0]
    if (conversation.user_id !== userId) throw new BusinessError('您没有权限删除该消息', 403)
    if (message.status === 1&&message.role === 'assistant') throw new BusinessError('Ai还在处理中，暂无法删除')
    const [deleteResult] = await pool.query('delete from chat_records where id=?', [messageId])
    if (deleteResult.affectedRows === 0) throw new BusinessError('删除消息失败')
}
//注销账号
const removeUser = async (userId) => {
    //清除所有ai对话
    clearMapAll(userId)
    const [userResult] = await pool.query('select id,avatar,is_deleted,nickname from users where id=?', [userId])
    if (userResult.length === 0) throw new BusinessError('用户不存在')
    const user = userResult[0]
    if (user.is_deleted) throw new BusinessError('用户已注销')
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()
        //对文章的操作
        //草稿/下线/待审核：直接删除文章
        await conn.query('delete from articles where author_id=? and status in ("draft","offline","pending")', [userId])
        //上线：作者修改为用户已注销
        await conn.query(`update articles set author='用户已注销' where author_id=? and status='published'`, [userId])
        //对评论的操作
        //软删除所有的评论
        await conn.query('update article_comment set is_deleted=1 where user_id=?', [userId])
        //删除ai对话记录
        await conn.query('delete from conversations where user_id=?', [userId])
        //最后软删除用户
        //头像修改成默认头像
        await conn.query('update users set is_deleted=1,avatar="/images/avatar/default.jpg",nickname="用户已注销" where id=?', [userId])
        await conn.commit()
    } catch (err) {
        await conn.rollback()
        throw err
    } finally {
        conn.release()
    }
    //如果头像不是默认头像，要删除头像文件
    if (user.avatar !== '/images/avatar/default.jpg') {
        const filePath = path.join(__dirname, '../../public', user.avatar)
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
            }
        } catch (err) {
            console.log('删除头像文件失败', err)
        }
    }
}
module.exports = {
    getUserinfo,
    changeUserInfo,
    changePsd,
    sendMessage,
    conversationList,
    conversationDetail,
    removeConversation,
    removeMessage,
    removeUser
}
