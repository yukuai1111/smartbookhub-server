const getPlainText=(html)=>{
    if (!html) return ''
    // 去掉所有html标签
    let text = html.replace(/<[^>]+>/g, '')
    // 去除空格、换行、制表符，压缩空白
    text = text.replace(/\s+/g, ' ').trim()
    return text
}
module.exports = getPlainText
