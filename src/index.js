require('dotenv').config()
const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')

const profileRouter = require('./routes/profiles')
const authRouter = require('./routes/auth')


const app = express()
app.set('trust proxy', 1)

app.use(morgan('dev'))

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  statusCode: 429,
  message: {
    status: 'error',
    message: 'Too many requests, please try again'
  }
})

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
   statusCode: 429,
  message: {
    status: 'error',
    message: 'Too many requests, please try again'
  }
})


function checkApiVersion(req, res, next){
  const version = req.headers['x-api-version']

  if (!version){
    return res.status(400).json({
      status: 'error',
      message: 'API version header required'
    })
  }
  next()
}
app.use('/auth', authLimiter)
app.use('/api', apiLimiter)
app.use('/api', checkApiVersion)

//routes
app.use('/auth', authRouter)
app.use('/api/profiles', profileRouter);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})