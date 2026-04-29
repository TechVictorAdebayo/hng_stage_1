const {verifyToken} = require ('../utils/tokens')
const prisma = require('../prismaClient')

async function authenticate (req, res, next){
    const authHeader = req.headers['authorization']

    if (!authHeader || !authHeader.startsWith('Bearer ')){
        return res.status(401).json({
            status: 'error',
            message: 'No token provided'
        })
    }

    const token = authHeader.split(' ')[1]
    const payload = verifyToken(token)

    if (!payload){
        return res.status(401).json({
            status: 'error',
            message: 'Invalid or expired token'
        })
    }

    const user = await prisma.user.findUnique({
        where: {id: payload.id}
    })

    if (!user || !user.is_active){
        return res.status(403).json({
            status: 'error',
            message: 'Account is inactive or not found'
        })
    }

    req.user = user
    next()
}

function authorize(...roles){
    return function(req, res, next){
        if (!roles.includes(req.user.role)){
            return res.status(403).json({
                status: 'error',
                message: 'You do not have permission to perform this action'
            })
        }
        next()  
    }
}

module.exports = {authenticate, authorize}