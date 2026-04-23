const { uuidv7 } = require('uuidv7')
const { PrismaClient } = require('@prisma/client')  // ✅ correct
const data = require('./seed_profiles.json')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL
    }
  }
})

async function main() {
  for (const profile of data.profiles) {
    await prisma.profile.upsert({
      where: { name: profile.name },
      update: {},
      create: { ...profile, id: uuidv7() }
    })
  }
  console.log('Seeding complete')
}

main().catch(console.error).finally(() => prisma.$disconnect())