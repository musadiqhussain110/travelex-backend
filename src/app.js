import express from "express"
import morgan from "morgan"
import cookieParser from "cookie-parser"
import compression from "compression"
import helmet from "helmet"
import rateLimit from "express-rate-limit"

import { env } from "./config/env.js"
import { securityMiddleware } from "./middleware/security.middleware.js"
import { notFound, errorHandler } from "./middleware/error.middleware.js"
import { sanitizeRequest } from "./middleware/sanitize.middleware.js"

import healthRoutes from "./routes/health.routes.js"
import authRoutes from "./routes/auth.routes.js"
import leadRoutes from "./routes/lead.routes.js"
import umrahPackageRoutes from "./routes/umrahPackage.routes.js"
import tourRoutes from "./routes/tour.routes.js"
import visaServiceRoutes from "./routes/visaService.routes.js"
import blogRoutes from "./routes/blog.routes.js"
import faqRoutes from "./routes/faq.routes.js"
import contactInquiryRoutes from "./routes/contactInquiry.routes.js"
import mediaRoutes from "./routes/media.routes.js"
import notificationRoutes from "./routes/notification.routes.js"
import dashboardRoutes from "./routes/dashboard.routes.js"
import whatsappRoutes from "./routes/whatsapp.routes.js"

const app = express()

securityMiddleware(app)

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
)

const publicFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
})

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
})

app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

app.use(sanitizeRequest)

app.use(cookieParser())
app.use(compression())

if (env.NODE_ENV === "development") {
  app.use(morgan("dev"))
}

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to TravelEx.pk Backend API",
  })
})

app.use("/api/v1/health", healthRoutes)

app.use("/api/v1/auth/login", adminLoginLimiter)
app.use("/api/v1/auth", authRoutes)

/*
  Rate limit only public form submissions.
  Admin protected CRM routes should not be affected by public form limiter.
*/
app.post("/api/v1/leads", publicFormLimiter)
app.post("/api/v1/contact-inquiries", publicFormLimiter)

app.use("/api/v1/leads", leadRoutes)
app.use("/api/v1/contact-inquiries", contactInquiryRoutes)

app.use("/api/v1/umrah-packages", umrahPackageRoutes)
app.use("/api/v1/tours", tourRoutes)
app.use("/api/v1/visa-services", visaServiceRoutes)
app.use("/api/v1/blogs", blogRoutes)
app.use("/api/v1/faqs", faqRoutes)
app.use("/api/v1/media", mediaRoutes)
app.use("/api/v1/notifications", notificationRoutes)
app.use("/api/v1/dashboard", dashboardRoutes)
app.use("/api/v1/whatsapp", whatsappRoutes)

app.use(notFound)
app.use(errorHandler)

export default app