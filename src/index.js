require('dotenv').config()

console.log("DATABASE_URL:", process.env.DATABASE_URL);

const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const morgan = require('morgan')

const profileRouter = require('./routes/profiles')
const authRouter = require('./routes/auth')


const app = express()
app.set('trust proxy', 1)

app.use(morgan('dev'))

// Middleware
app.use(cors())
app.use(express.json())

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    status: 'error',
    message: 'Too many requests, please try again'
  }
})

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
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