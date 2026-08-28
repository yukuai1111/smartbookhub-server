//创建流式返回响应的三个方法
const createStreamResponse = (res) => {
    //设置响应头
    res.setHeader('Content-Type', "text/event-stream")
    res.setHeader('Cache-Control', "no-cache")  //不缓存，确保数据最新
    res.setHeader('Connection', "keep-alive")  //保持连接
    return {
        //返回三个方法
        //1.发送数据
        send: (data) => {
            try {
                res.write(`data: ${JSON.stringify(data)}\n\n`)  //把对象转成字符串
            }
            catch (err) {
                console.log("流式发送错误", err)
            }
        },
        //2.数据发送完成
        end: () => {
            res.write(`event: end\ndata:{"done":true}\n\n`)
            res.end()
        },
        //3.发送数据异常
        error: (err) => {
            try {
                res.write(`data: ${JSON.stringify(err)}\n\n`)
                res.end()
            }
            catch (err) {
                console.log("流式数据错误", err)
            }
        }
    }
}
module.exports = {
    createStreamResponse
}