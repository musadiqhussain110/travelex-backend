import "dotenv/config"
import mongoose from "mongoose"

import Lead from "../models/Lead.model.js"

import {
  openSalesStatuses,
  getTodayDateRange,
} from "../utils/followUpDate.utils.js"

const getMongoUri = () => {
  return (
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.DATABASE_URL ||
    ""
  )
}

const formatDate = (value) => {
  if (!value) return null

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toISOString()
}

const isDateInRange = (
  value,
  start,
  end
) => {
  if (!value) return false

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return false
  }

  return date >= start && date < end
}

const inspectLead = (
  lead,
  start,
  end
) => {
  const reasons = []

  const openStatus =
    openSalesStatuses.includes(lead.status)

  const scheduled =
    lead.followUpStatus === "Scheduled"

  const today =
    isDateInRange(
      lead.followUpDate,
      start,
      end
    )

  const notArchived =
    lead.isArchived === false

  if (!notArchived) {
    reasons.push(
      `isArchived is ${String(
        lead.isArchived
      )}, expected false`
    )
  }

  if (!openStatus) {
    reasons.push(
      `status "${lead.status}" is not an open sales status`
    )
  }

  if (!scheduled) {
    reasons.push(
      `followUpStatus is "${lead.followUpStatus}", expected "Scheduled"`
    )
  }

  if (!today) {
    reasons.push(
      `followUpDate ${formatDate(
        lead.followUpDate
      )} is outside today's range`
    )
  }

  return {
    id: String(lead._id),

    name: lead.name,

    email: lead.email,

    status: lead.status,

    isArchived: lead.isArchived,

    followUpDate:
      formatDate(lead.followUpDate),

    followUpTime:
      lead.followUpTime || "",

    followUpStatus:
      lead.followUpStatus || "",

    assignedTo:
      lead.assignedTo
        ? {
            id: String(
              lead.assignedTo._id ||
                lead.assignedTo
            ),

            name:
              lead.assignedTo.name ||
              "",

            email:
              lead.assignedTo.email ||
              "",

            role:
              lead.assignedTo.role ||
              "",

            isActive:
              lead.assignedTo.isActive,
          }
        : null,

    checks: {
      notArchived,
      openStatus,
      scheduled,
      today,
    },

    eligibleForReminder:
      notArchived &&
      openStatus &&
      scheduled &&
      today,

    exclusionReasons:
      reasons,
  }
}

const run = async () => {
  const mongoUri = getMongoUri()

  if (!mongoUri) {
    throw new Error(
      "MongoDB URI missing. Expected MONGODB_URI, MONGO_URI, or DATABASE_URL."
    )
  }

  console.log(
    "\nConnecting to MongoDB..."
  )

  await mongoose.connect(mongoUri)

  console.log(
    "Connected successfully.\n"
  )

  const {
    start,
    end,
  } = getTodayDateRange()

  console.log(
    "======================================"
  )

  console.log(
    "TODAY RANGE USED BY REMINDER ENGINE"
  )

  console.log(
    "======================================"
  )

  console.log({
    start: start?.toISOString(),
    end: end?.toISOString(),
    openSalesStatuses,
  })

  /*
  |--------------------------------------------------------------------------
  | Find every lead that appears to have any follow-up configured
  |--------------------------------------------------------------------------
  */
  const leadsWithFollowUps =
    await Lead.find({
      $or: [
        {
          followUpDate: {
            $exists: true,
            $ne: null,
          },
        },

        {
          followUpStatus: {
            $exists: true,
            $nin: [
              null,
              "",
              "Not Set",
            ],
          },
        },
      ],
    })
      .select(
        [
          "name",
          "email",
          "status",
          "isArchived",
          "followUpDate",
          "followUpTime",
          "followUpStatus",
          "assignedTo",
          "updatedAt",
        ].join(" ")
      )
      .populate(
        "assignedTo",
        "name email role isActive"
      )
      .sort({
        updatedAt: -1,
      })
      .limit(100)
      .lean()

  const inspected =
    leadsWithFollowUps.map(
      (lead) =>
        inspectLead(
          lead,
          start,
          end
        )
    )

  /*
  |--------------------------------------------------------------------------
  | Diagnostic counts
  |--------------------------------------------------------------------------
  */
  const [
    totalWithDate,
    totalScheduled,
    todayAnyStatus,
    todayScheduled,
    todayOpenStatus,
    strictReminderMatches,
  ] = await Promise.all([
    Lead.countDocuments({
      followUpDate: {
        $exists: true,
        $ne: null,
      },
    }),

    Lead.countDocuments({
      followUpStatus: "Scheduled",
    }),

    Lead.countDocuments({
      followUpDate: {
        $gte: start,
        $lt: end,
      },
    }),

    Lead.countDocuments({
      followUpStatus: "Scheduled",

      followUpDate: {
        $gte: start,
        $lt: end,
      },
    }),

    Lead.countDocuments({
      status: {
        $in: openSalesStatuses,
      },

      followUpDate: {
        $gte: start,
        $lt: end,
      },
    }),

    Lead.countDocuments({
      isArchived: false,

      status: {
        $in: openSalesStatuses,
      },

      followUpStatus: "Scheduled",

      followUpDate: {
        $gte: start,
        $lt: end,
      },
    }),
  ])

  console.log(
    "\n======================================"
  )

  console.log(
    "DIAGNOSTIC COUNTS"
  )

  console.log(
    "======================================"
  )

  console.log({
    totalWithDate,
    totalScheduled,
    todayAnyStatus,
    todayScheduled,
    todayOpenStatus,
    strictReminderMatches,
  })

  console.log(
    "\n======================================"
  )

  console.log(
    "LEADS WITH FOLLOW-UP DATA"
  )

  console.log(
    "======================================"
  )

  if (inspected.length === 0) {
    console.log(
      "No leads with follow-up data were found."
    )
  } else {
    inspected.forEach(
      (lead, index) => {
        console.log(
          `\n--- Lead ${index + 1} ---`
        )

        console.log(
          JSON.stringify(
            lead,
            null,
            2
          )
        )
      }
    )
  }

  console.log(
    "\n======================================"
  )

  console.log(
    "ELIGIBLE TODAY"
  )

  console.log(
    "======================================"
  )

  const eligible =
    inspected.filter(
      (lead) =>
        lead.eligibleForReminder
    )

  if (eligible.length === 0) {
    console.log(
      "No leads currently satisfy every reminder condition."
    )
  } else {
    eligible.forEach((lead) => {
      console.log({
        id: lead.id,
        name: lead.name,
        followUpDate:
          lead.followUpDate,
        followUpStatus:
          lead.followUpStatus,
        status: lead.status,
        assignedTo:
          lead.assignedTo,
      })
    })
  }
}

try {
  await run()
} catch (error) {
  console.error(
    "\nFollow-up diagnostic failed:"
  )

  console.error(
    error?.stack ||
      error?.message ||
      error
  )

  process.exitCode = 1
} finally {
  if (
    mongoose.connection.readyState !== 0
  ) {
    await mongoose.disconnect()
  }

  console.log(
    "\nDisconnected from MongoDB."
  )
}