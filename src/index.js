const express = require('express')
const cors = require('cors')
require('dotenv').config()
const router = require('./routes/profiles')

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use('/api/profiles', router);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' })
})


const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})