require('dotenv').config()
const jwt = require('jsonwebtoken')

const ACCESS_TOKEN_EXPIRY = '3m'
const REFRESH_TOKEN_EXPIRY = '5m'

function generateAccessToken(user){
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role
    }

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY
    })
}

function generateRefreshToken (user){
    const payload = {
        id: user.id
    }

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY
    })
}

function verifyToken(token){
    try{
        return jwt.verify(token, process.env.JWT_SECRET)
    }catch(error){
        console.log(error.message);
        return null
        
    }
}
module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyToken
}
