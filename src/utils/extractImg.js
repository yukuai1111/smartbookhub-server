//提取富文本的插图
const extractImg = (content) => {
    if (!content) return []
    const reg = /<img[^>]+src="([^"]+)"/g    //[^>]+ 匹配除大于号以外的任意字符，+ 表示匹配1个或多个   ()捕获的内容
    const list = []
    let match
    while ((match = reg.exec(content)) !== null) {
        let src=match[1]
        console.log(src)
        //截取掉前面的协议和域名
        src=src.replace(/^https?:\/\/.+?\d+\//,'/')
        console.log(src)
        list.push(src)
    }
    return list
}
module.exports = extractImg