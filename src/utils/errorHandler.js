module.exports = class BusinessError extends Error{
    constructor(errmessage,status=400,outerCode){
        super(errmessage)
        this.status=status
        this.outerCode=outerCode
    }
}