import "dotenv/config"
import mongoose from "mongoose"

import {
  runDailyFollowUpReminders,
} from "../services/followUpReminder.service.js"

const getMongoUri = () => {
  return (
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.DATABASE_URL ||
    ""
  )
}

const connectDatabase = async () => {
  const mongoUri = getMongoUri()

  if (!mongoUri) {
    throw new Error(
      "MongoDB connection string is missing. Expected MONGODB_URI, MONGO_URI, or DATABASE_URL."
    )
  }

  await mongoose.connect(mongoUri)

  console.log(
    "Connected to MongoDB for follow-up reminder job."
  )
}

const disconnectDatabase = async () => {
  if (
    mongoose.connection.readyState !== 0
  ) {
    await mongoose.disconnect()

    console.log(
      "Disconnected from MongoDB."
    )
  }
}

const run = async () => {
  const startedAt = new Date()

  console.log(
    "Starting TravelEx daily follow-up reminder job..."
  )

  console.log(
    `Started at: ${startedAt.toISOString()}`
  )

  try {
    await connectDatabase()

    const result =
      await runDailyFollowUpReminders()

    console.log(
      "Daily follow-up reminder job completed successfully."
    )

    console.log(
      JSON.stringify(
        result,
        null,
        2
      )
    )

    process.exitCode = 0
  } catch (error) {
    console.error(
      "Daily follow-up reminder job failed."
    )

    console.error(
      error?.stack ||
        error?.message ||
        error
    )

    process.exitCode = 1
  } finally {
    try {
      await disconnectDatabase()
    } catch (disconnectError) {
      console.error(
        "Failed to disconnect MongoDB cleanly:",
        disconnectError?.message ||
          disconnectError
      )

      process.exitCode = 1
    }
  }
}

run()