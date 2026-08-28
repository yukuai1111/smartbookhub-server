//查找敏感词
const sensitiveList = require('./sensitiveWords')

const checkArticle = (article) => {
    if (!article || typeof article !== 'string') return true
    for (let word of sensitiveList) {
        const reg = new RegExp(word, 'gi')
        if (reg.test(article)) {
            return false
        }
    }
    return true
}

const filterArticle = (article) => {
    if (!article || typeof article !== 'string') return article
    let str=article
    for (let word of sensitiveList) {
        const reg = new RegExp(word, 'gi')
        if (reg.test(str)) {
            str = str.replace(reg, '***')
        }
    }
    return str
}
module.exports = {checkArticle,filterArticle}