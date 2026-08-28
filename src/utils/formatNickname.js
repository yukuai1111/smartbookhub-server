const { getNickCacheCount, isAdmin } = require('../memory/nicknameCache')
module.exports = formatNickname = (userList) => {
    const nicknameMap = new Map()
    if (!Array.isArray(userList) || userList.length === 0) return nicknameMap
    //决定展示的名字
    userList.forEach(item => {
        let showName
        const del = item.is_deleted === 1
        if (del) {
            showName = '用户已注销'
        } else if (isAdmin(item.id)) {
            showName = item.nickname
        }
        else {
            if (getNickCacheCount(item.nickname) > 1) {
                showName = item.nickname + '#' + item.id.slice(-6)
            }
            else showName = item.nickname
        }
        nicknameMap.set(item.id, showName)
    })
    return nicknameMap
}
