const express = require ('express')
const axios = require('axios')
const router = express.Router()
const prisma = require('../prismaClient')
const {uuidv7} = require ('uuidv7')
const {
    generateAccessToken,
    generateRefreshToken,
    verifyToken
} = require('../utils/tokens')

router.get('/github', (req, res) => {
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=user:email`

    res.redirect(githubAuthUrl)
})

router.get('/github/callback', async (req, res) => {
    const {code, code_verifier} = req.query

    if (!code){
        return res.status(400).json({
            status: 'error',
            message: 'No code provided'
        })
    }

    try{
        const tokenResponse = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
                code_verifier
            },
            {
                headers: {Accept: 'application/json'}
            }
        )
        const githubAccessToken = tokenResponse.data.access_token
        

        if (!githubAccessToken){
            return res.status(401).json({
                status: 'error',
                message: 'Failed to get Github access token'
            })
        }

        const userResponse = await axios.get('https://api.github.com/user', {
            headers: {Authorization: `Bearer ${githubAccessToken}`}
        })

        const {id: github_id, login: username, avatar_url} = userResponse.data

        const emailResponse = await axios.get('https://api.github.com/user/emails',
            {
                headers: {Authorization: `Bearer ${githubAccessToken}`}
            }
        )

        const primaryEmail = emailResponse.data.find(
            e => e.primary && e.verified
        )

        const email = primaryEmail ? primaryEmail.email : null

        // create or update user
        let user = await prisma.user.findUnique({
            where: {github_id: String (github_id)}
        })

        if (!user){
            user = await prisma.user.create({
                data: {
                    id: uuidv7(),
                    github_id: String(github_id),
                    username,
                    email,
                    avatar_url,
                    role:'analyst'
                }
            })
        }else {
            user = await prisma.user.update({
                where: {github_id: String(github_id)},
                data: {
                    username,
                    email,
                    avatar_url,
                    last_login_at: new Date()
                }
            })
        }

        //Generate Token
        const accessToken = generateAccessToken(user)
        const refreshToken = generateRefreshToken(user)

        const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
        await prisma.refreshToken.create({
            data: {
                id: uuidv7(),
                token: refreshToken,
                userId: user.id,
                expiresAt
            }
        })

        //return tokens
       // set tokens as HTTP-only cookies
        res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 3 * 60 * 1000 // 3 minutes
        })

        res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 5 * 60 * 1000 // 5 minutes
        })

        // redirect to frontend
        return res.redirect(`${process.env.FRONTEND_URL}/`)
    }catch(error){
        console.log(error);
        return res.status(500).json({
            status: 'error',
            message: 'Authentication failed'
        })
        
    }
})

router.post('/refresh', async(req, res) => {

    const {refresh_token} =req.body

    if (!refresh_token){
        return res.status(400).json({
            status: 'error',
            message: 'Refresh token required'
        })
    }

    const payload = verifyToken(refresh_token)

    if (!payload){
        return res.status(401).json({
            staus: 'error',
            message: 'Invalid or expired token'
        })
    }

    try{
        const storedToken = await prisma.refreshToken.findUnique({
            where: {token: refresh_token}
        })

        if (!storedToken){
            return res.status(401).json({
                status: 'error',
                message: 'Refresh token not found or already used'
            })
        }

        if (storedToken.expiresAt < new Date()){
            await prisma.refreshToken.delete({
                where: {token: refresh_token}
            })

            return res.status(401).json({
                status: 'error',
                message: 'Refresh token expired'
            })
        }

        await prisma.refreshToken.delete({
            where: {token: refresh_token}
        })

        const user = await prisma.user.findUnique({
            where: {id: payload.id}
        })

        if (!user || !user.is_active){
            return res.status(403). json({
                status: 'error',
                message: 'User not found or not active'
            })
        }

        const newAccessToken = generateAccessToken(user)
        const newRefreshToken = generateRefreshToken(user)

        const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
        await prisma.refreshToken.create({
            data: {
                id: uuidv7(),
                token: newRefreshToken,
                userId: user.id,
                expiresAt
            }
        })

        return res.status(200).json({
            status: 'success',
            access_token: newAccessToken,
            refresh_token: newRefreshToken
        })
    }catch(error){
        console.log(error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server error'
        })
        
    }
})

router.post('/logout', async(req, res) => {
    const {refresh_token} = req.body

    if (!refresh_token){
        return res.status(401).json({
            status: 'error',
            message: 'Token not found'
        })
    }

    try{
        await prisma.refreshToken.delete({
            where: {token: refresh_token}
    })
    return res.status(200).json({
        status: 'success',
        message: 'Logged out successfully'
    })
    }catch(error){
        console.log(error);
        return res.status(200).json({
            status: 'succes',
            message: 'Logged out succesfully'
        })
        
    }

})

router.get('/me', async (req, res) => {
  const token = req.cookies?.access_token

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authenticated'
    })
  }

  const payload = verifyToken(token)

  if (!payload) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token'
    })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.id }
    })

    if (!user || !user.is_active) {
      return res.status(403).json({
        status: 'error',
        message: 'User not found or inactive'
      })
    }

    return res.status(200).json({
      status: 'success',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        role: user.role
      }
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    })
  }
})

module.exports = router