import {
  runDailyFollowUpReminders as executeDailyFollowUpReminders,
} from "../services/followUpReminder.service.js"

/*
|--------------------------------------------------------------------------
| Run daily follow-up reminders manually
|--------------------------------------------------------------------------
| Protected endpoint.
|
| Used for:
| - production testing
| - Postman/manual execution
| - future scheduler integration
|
| Important:
| This executes inside the deployed backend process, so it uses the exact
| MongoDB connection/environment configured for that backend.
|--------------------------------------------------------------------------
*/
export const runDailyFollowUpRemindersNow = async (
  req,
  res,
  next
) => {
  try {
    const startedAt = new Date()

    const result =
      await executeDailyFollowUpReminders()

    const completedAt = new Date()

    return res.status(200).json({
      success: true,

      message:
        "Daily follow-up reminder job completed successfully.",

      execution: {
        startedAt,
        completedAt,

        durationMs:
          completedAt.getTime() -
          startedAt.getTime(),

        triggeredBy: req.admin
          ? {
              id: req.admin._id,
              name: req.admin.name,
              email: req.admin.email,
              role: req.admin.role,
            }
          : null,
      },

      result,
    })
  } catch (error) {
    return next(error)
  }
}