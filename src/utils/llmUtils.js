//创建流式聊天
require('dotenv').config()
const BusinessError = require('./errorHandler')
//读取密钥/模型/路径
const apiKey = process.env.ZHIPU_API_KEY
const baseUrl = process.env.ZHIPU_BASE_URL
const model = process.env.ZHIPU_MODEL

const createStream = async (messages, onChunk, signal) => {
    const res = await fetch(`${baseUrl}chat/completions`, {
        method: 'POST',
        signal,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages,  //这里的格式要是[{role,content}]
            temperature: 0.7,
            max_tokens: 4096,
            stream: true // 开启流式
        })
    })
    if (!res.ok) {
        const errData = await res.json().catch(() => { })
        const errMsg = errData.error?.message || '云端模型未知错误'
        const errCode = Number(errData.error?.code)
        const bizErr = new BusinessError(errMsg, 400, errCode)
        throw bizErr
    }
    //需要对返回的数据经行处理，才可以进行迭代处理
    //获取读取流的读取器
    const reader = res.body.getReader()
    //把流数据（二进制）转成字符串结构
    const decoder = new TextDecoder()
    //把读取的数据存入缓存
    let buffer = ''
    //完整数据
    let fullResponse = ''
    try {
        //循环读取，直到结束
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            //把数据按行切分
            const lines = buffer.split('\n')
            //把最后的空行或者是不完整的数据重新存入buffer，用于后续拼接完整数据
            buffer = lines.pop() || ''
            //遍历数据每一个元素，取出里面的content传出去
            for (const line of lines) {
                //先去掉每一个元素的空格
                const trimLine = line.trim()
                //如果是空行就跳过
                if (trimLine === '') continue
                //如果有结束标志就跳过
                if (trimLine === 'data: [DONE]') continue
                //如果以data: 开头，就开始提取
                if (trimLine.startsWith('data: ')) {
                    try {
                        //先去掉data: 前缀，并转成字符串
                        const data = JSON.parse(trimLine.slice(6))
                        //开始提取content
                        const content = data.choices?.[0]?.delta?.content
                        if (content) {
                            //拼接完整数据
                            fullResponse += content
                            //直接传给前端
                            onChunk(content)
                        }
                    } catch (err) {
                        console.log("解析数据失败", err)
                    }
                }
            }
        }
    } finally {
        //关闭流
        reader.cancel().catch(() => { })
    }
    return fullResponse
}

//生成标题
const generateTitle = async (userMessage, aiMessage, signal) => {
    //新对话：产生标题
    const prompt = `你是专业标题生成器，根据下面对话生成标题。
                    要求：
                    1. 只输出最终标题本身，**不要任何解释、不要说明、不要开场白、不要“标题：”这类前缀、不要多余标点符号、不要换行**；
                    2. 标题控制在5‑15个汉字；
                    3. 不要输出“标题生成完成”“以上为标题”这类废话；
                    4. 禁止输出空内容，只返回纯标题文本。
                    用户：${userMessage}
                    AI：${aiMessage}`

    const apiKey = process.env.ZHIPU_API_KEY
    const baseUrl = process.env.ZHIPU_BASE_URL
    const model = process.env.ZHIPU_MODEL
    const res = await fetch(`${baseUrl}chat/completions`, {
        method: 'POST',
        signal,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],  //这里的格式要是[{role,content}]
            temperature: 0.4,
            stream: false
        })
    })
    const data = await res.json()
    let title = ''
    if (!res.ok || data.error) {
        console.log('生成标题接口错误')
        return null
    }
    if (!data.choices?.[0]?.message?.content) return null
    title = data.choices[0].message.content
    if (title.trim().length < 5) return null
    if (title.trim().length > 15) return title.slice(0, 15)
    return title
}
module.exports = { createStream, generateTitle }
