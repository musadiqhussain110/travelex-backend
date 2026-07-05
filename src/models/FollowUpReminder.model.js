import mongoose from "mongoose"

const reminderChannels = ["email", "whatsapp"]

const reminderStatuses = [
  "pending",
  "sent",
  "failed",
  "skipped",
]

const reminderTypes = [
  "daily-digest",
]

const followUpReminderSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | Consultant receiving the reminder
    |--------------------------------------------------------------------------
    */
    consultant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: [true, "Consultant is required"],
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Reminder date
    |--------------------------------------------------------------------------
    | Actual date object for reporting.
    */
    reminderDate: {
      type: Date,
      required: [true, "Reminder date is required"],
    },

    /*
    |--------------------------------------------------------------------------
    | Stable date key
    |--------------------------------------------------------------------------
    | Example:
    | 2026-07-06
    |
    | Used for duplicate prevention.
    */
    reminderDateKey: {
      type: String,
      required: [true, "Reminder date key is required"],
      trim: true,
      match: [
        /^\d{4}-\d{2}-\d{2}$/,
        "Reminder date key must use YYYY-MM-DD format",
      ],
    },

    reminderType: {
      type: String,
      enum: reminderTypes,
      default: "daily-digest",
      required: true,
    },

    channel: {
      type: String,
      enum: reminderChannels,
      required: [true, "Reminder channel is required"],
    },

    status: {
      type: String,
      enum: reminderStatuses,
      default: "pending",
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Recipient snapshot
    |--------------------------------------------------------------------------
    | Email address or WhatsApp number used for this reminder.
    */
    recipient: {
      type: String,
      trim: true,
      default: "",
      maxlength: [
        320,
        "Reminder recipient cannot exceed 320 characters",
      ],
    },

    /*
    |--------------------------------------------------------------------------
    | Follow-up snapshot
    |--------------------------------------------------------------------------
    */
    followUpCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    leadIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lead",
      },
    ],

    /*
    |--------------------------------------------------------------------------
    | Provider information
    |--------------------------------------------------------------------------
    | Examples:
    | resend
    | meta_whatsapp_cloud
    */
    provider: {
      type: String,
      trim: true,
      default: "",
      maxlength: [
        100,
        "Provider cannot exceed 100 characters",
      ],
    },

    providerMessageId: {
      type: String,
      trim: true,
      default: "",
      maxlength: [
        500,
        "Provider message ID cannot exceed 500 characters",
      ],
    },

    /*
    |--------------------------------------------------------------------------
    | Sending lifecycle
    |--------------------------------------------------------------------------
    */
    sentAt: {
      type: Date,
      default: null,
    },

    lastAttemptAt: {
      type: Date,
      default: null,
    },

    attemptCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    errorMessage: {
      type: String,
      trim: true,
      default: "",
      maxlength: [
        3000,
        "Error message cannot exceed 3000 characters",
      ],
    },

    /*
    |--------------------------------------------------------------------------
    | Optional provider/debug metadata
    |--------------------------------------------------------------------------
    */
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

/*
|--------------------------------------------------------------------------
| Duplicate protection
|--------------------------------------------------------------------------
| One consultant should receive at most one successful daily digest
| per channel for a given date.
|
| Example:
|
| Ahmed
| 2026-07-06
| daily-digest
| email
|
| Only one record identity.
|--------------------------------------------------------------------------
*/
followUpReminderSchema.index(
  {
    consultant: 1,
    reminderDateKey: 1,
    reminderType: 1,
    channel: 1,
  },
  {
    unique: true,
    name: "unique_consultant_daily_reminder_channel",
  }
)

/*
|--------------------------------------------------------------------------
| Reporting indexes
|--------------------------------------------------------------------------
*/
followUpReminderSchema.index({
  reminderDateKey: 1,
  status: 1,
})

followUpReminderSchema.index({
  consultant: 1,
  createdAt: -1,
})

followUpReminderSchema.index({
  channel: 1,
  status: 1,
  createdAt: -1,
})

const FollowUpReminder = mongoose.model(
  "FollowUpReminder",
  followUpReminderSchema
)

export default FollowUpReminder