const RESEND_API_URL = "https://api.resend.com/emails"

const isFalseLike = (value) => {
  return ["false", "0", "no", "off"].includes(
    String(value || "")
      .trim()
      .toLowerCase()
  )
}

const isEmailEnabled = () => {
  if (isFalseLike(process.env.EMAIL_ENABLED)) {
    return false
  }

  return Boolean(
    process.env.RESEND_API_KEY &&
      process.env.EMAIL_FROM
  )
}

const escapeHtml = (value = "") => {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

const formatServiceType = (serviceType = "general") => {
  const labels = {
    umrah: "Umrah Package",
    tour: "International Tour",
    visa: "Visa Assistance",
    hotel: "Hotel Booking",
    carRental: "Transport Service",
    contact: "Contact Inquiry",
    general: "General Inquiry",
    ticket: "Air Ticket",
  }

  return labels[serviceType] || "General Inquiry"
}

const formatFollowUpTime = (time = "") => {
  if (!time) return "Time not set"

  const value = String(time).trim()
  const match = value.match(/^(\d{1,2}):(\d{2})$/)

  if (!match) return value

  const hours = Number(match[1])
  const minutes = match[2]

  if (
    Number.isNaN(hours) ||
    hours < 0 ||
    hours > 23
  ) {
    return value
  }

  const period = hours >= 12 ? "PM" : "AM"
  const displayHours = hours % 12 || 12

  return `${displayHours}:${minutes} ${period}`
}

const sortFollowUps = (followUps = []) => {
  return [...followUps].sort((a, b) => {
    const timeA = String(a.followUpTime || "99:99")
    const timeB = String(b.followUpTime || "99:99")

    return timeA.localeCompare(timeB)
  })
}

const getDateLabel = (date = new Date()) => {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Karachi",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date)
  } catch {
    return new Date(date).toLocaleDateString("en-GB")
  }
}

const buildFollowUpDigestText = ({
  consultant,
  followUps = [],
  crmUrl = "",
  reminderDate = new Date(),
}) => {
  const sortedFollowUps = sortFollowUps(followUps)

  const lines = sortedFollowUps.map(
    (lead, index) => {
      return [
        `${index + 1}. ${lead.name || "Customer"}`,
        `   Service: ${formatServiceType(
          lead.serviceType
        )}`,
        `   Time: ${formatFollowUpTime(
          lead.followUpTime
        )}`,
        lead.phone
          ? `   Phone: ${lead.phone}`
          : null,
        lead.followUpNote
          ? `   Note: ${lead.followUpNote}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    }
  )

  return [
    `Assalamualaikum ${
      consultant?.name || "Consultant"
    },`,
    "",
    `You have ${sortedFollowUps.length} scheduled customer follow-up(s) for ${getDateLabel(
      reminderDate
    )}.`,
    "",
    ...lines.flatMap((line) => [line, ""]),
    crmUrl
      ? `Open TravelEx CRM: ${crmUrl}`
      : null,
    "",
    "Please update each follow-up after contacting the customer.",
    "",
    "Regards,",
    "TravelEx.pk CRM",
  ]
    .filter((item) => item !== null)
    .join("\n")
}

const buildFollowUpDigestHtml = ({
  consultant,
  followUps = [],
  crmUrl = "",
  reminderDate = new Date(),
}) => {
  const sortedFollowUps = sortFollowUps(followUps)

  const followUpRows = sortedFollowUps
    .map((lead, index) => {
      return `
        <tr>
          <td style="
            padding: 14px 12px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
            color: #0f172a;
            font-weight: 700;
          ">
            ${index + 1}
          </td>

          <td style="
            padding: 14px 12px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
          ">
            <div style="
              color: #0f172a;
              font-weight: 700;
              margin-bottom: 4px;
            ">
              ${escapeHtml(lead.name || "Customer")}
            </div>

            <div style="
              color: #64748b;
              font-size: 13px;
              line-height: 1.6;
            ">
              ${escapeHtml(
                formatServiceType(lead.serviceType)
              )}
            </div>
          </td>

          <td style="
            padding: 14px 12px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
            color: #0f172a;
            font-weight: 600;
          ">
            ${escapeHtml(
              formatFollowUpTime(lead.followUpTime)
            )}
          </td>

          <td style="
            padding: 14px 12px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
            color: #475569;
            font-size: 13px;
            line-height: 1.6;
          ">
            ${
              lead.phone
                ? `<div><strong>Phone:</strong> ${escapeHtml(
                    lead.phone
                  )}</div>`
                : ""
            }

            ${
              lead.followUpNote
                ? `<div style="margin-top: 4px;"><strong>Note:</strong> ${escapeHtml(
                    lead.followUpNote
                  )}</div>`
                : ""
            }
          </td>
        </tr>
      `
    })
    .join("")

  return `
    <!doctype html>
    <html>
      <body style="
        margin: 0;
        padding: 0;
        background: #f8fafc;
        font-family: Arial, Helvetica, sans-serif;
        color: #0f172a;
      ">
        <div style="
          max-width: 760px;
          margin: 0 auto;
          padding: 32px 16px;
        ">
          <div style="
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            overflow: hidden;
          ">
            <div style="
              background: #0f172a;
              padding: 24px;
            ">
              <div style="
                color: #00AEEF;
                font-size: 12px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.08em;
              ">
                TravelEx CRM
              </div>

              <h1 style="
                margin: 8px 0 0;
                color: #ffffff;
                font-size: 26px;
                line-height: 1.25;
              ">
                Daily Follow-up Reminder
              </h1>
            </div>

            <div style="padding: 24px;">
              <p style="
                margin: 0;
                color: #334155;
                font-size: 15px;
                line-height: 1.7;
              ">
                Assalamualaikum
                <strong>
                  ${escapeHtml(
                    consultant?.name || "Consultant"
                  )}
                </strong>,
              </p>

              <p style="
                margin: 12px 0 20px;
                color: #475569;
                font-size: 15px;
                line-height: 1.7;
              ">
                You have
                <strong style="color: #FF6B00;">
                  ${sortedFollowUps.length}
                </strong>
                scheduled customer follow-up(s) for
                <strong>
                  ${escapeHtml(
                    getDateLabel(reminderDate)
                  )}
                </strong>.
              </p>

              <div style="
                overflow-x: auto;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
              ">
                <table
                  role="presentation"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="
                    width: 100%;
                    border-collapse: collapse;
                  "
                >
                  <thead>
                    <tr style="background: #f8fafc;">
                      <th style="
                        padding: 12px;
                        text-align: left;
                        font-size: 12px;
                        color: #64748b;
                      ">
                        #
                      </th>

                      <th style="
                        padding: 12px;
                        text-align: left;
                        font-size: 12px;
                        color: #64748b;
                      ">
                        Customer
                      </th>

                      <th style="
                        padding: 12px;
                        text-align: left;
                        font-size: 12px;
                        color: #64748b;
                      ">
                        Time
                      </th>

                      <th style="
                        padding: 12px;
                        text-align: left;
                        font-size: 12px;
                        color: #64748b;
                      ">
                        Follow-up
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    ${followUpRows}
                  </tbody>
                </table>
              </div>

              ${
                crmUrl
                  ? `
                    <div style="
                      margin-top: 24px;
                      text-align: center;
                    ">
                      <a
                        href="${escapeHtml(crmUrl)}"
                        style="
                          display: inline-block;
                          background: #FF6B00;
                          color: #ffffff;
                          padding: 13px 20px;
                          text-decoration: none;
                          border-radius: 5px;
                          font-weight: 700;
                          font-size: 14px;
                        "
                      >
                        Open TravelEx CRM
                      </a>
                    </div>
                  `
                  : ""
              }

              <p style="
                margin: 24px 0 0;
                color: #64748b;
                font-size: 13px;
                line-height: 1.7;
              ">
                Please update each follow-up after contacting the customer so no lead is missed.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

/*
|--------------------------------------------------------------------------
| Generic email sender
|--------------------------------------------------------------------------
*/
export const sendEmail = async ({
  to,
  subject,
  text,
  html,
}) => {
  if (!to) {
    return {
      success: false,
      skipped: true,
      reason: "Recipient email is missing.",
    }
  }

  if (!isEmailEnabled()) {
    return {
      success: false,
      skipped: true,
      reason:
        "Email provider is not configured or email sending is disabled.",
    }
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",

      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [to],
        subject,
        text,
        html,
      }),
    })

    const data = await response
      .json()
      .catch(() => ({}))

    if (!response.ok) {
      return {
        success: false,
        provider: "resend",
        error:
          data?.message ||
          data?.error?.message ||
          "Email failed to send.",
        response: data,
      }
    }

    return {
      success: true,
      provider: "resend",
      providerMessageId: data?.id || "",
      response: data,
    }
  } catch (error) {
    return {
      success: false,
      provider: "resend",
      error:
        error.message ||
        "Email request failed.",
    }
  }
}

/*
|--------------------------------------------------------------------------
| Daily consultant follow-up email
|--------------------------------------------------------------------------
*/
export const sendFollowUpDigestEmail = async ({
  consultant,
  followUps = [],
  crmUrl = "",
  reminderDate = new Date(),
}) => {
  if (!consultant) {
    return {
      success: false,
      skipped: true,
      reason: "Consultant is required.",
    }
  }

  if (!consultant.email) {
    return {
      success: false,
      skipped: true,
      reason:
        "Consultant email address is missing.",
    }
  }

  if (
    !Array.isArray(followUps) ||
    followUps.length === 0
  ) {
    return {
      success: false,
      skipped: true,
      reason:
        "No scheduled follow-ups found.",
    }
  }

  const subject =
    `TravelEx CRM — ${followUps.length} ` +
    `Follow-up${followUps.length === 1 ? "" : "s"} Today`

  const text = buildFollowUpDigestText({
    consultant,
    followUps,
    crmUrl,
    reminderDate,
  })

  const html = buildFollowUpDigestHtml({
    consultant,
    followUps,
    crmUrl,
    reminderDate,
  })

  return sendEmail({
    to: consultant.email,
    subject,
    text,
    html,
  })
}