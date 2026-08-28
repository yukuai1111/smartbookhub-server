const {BusinessError} = require('./errorHandler.js')
const {v7:uuidv7} = require('uuid')
const generateUserId = (type) => {
    if(!['admin','user'].includes(type))
    throw new BusinessError('用户类型错误')
    return type+'-'+uuidv7()
}
module.exports = generateUserId
