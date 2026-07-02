import jwt from "jsonwebtoken"
import Admin from "../models/Admin.model.js"
import { env } from "../config/env.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const normalizeAdminAccess = async (admin) => {
  let shouldSave = false

  // Safe migration for old accounts using previous "staff" role
  if (admin.role === "staff") {
    admin.role = "consultant"
    admin.permissions = Admin.getDefaultPermissions("consultant")
    shouldSave = true
  }

  // Add default permissions for old accounts
  if (!admin.permissions || Object.keys(admin.permissions).length === 0) {
    admin.permissions = Admin.getDefaultPermissions(admin.role)
    shouldSave = true
  }

  if (shouldSave) {
    await admin.save()
  }

  return admin
}

export const protect = asyncHandler(async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1]
  }

  if (!token) {
    res.status(401)
    throw new Error("Not authorized. Token missing.")
  }

  const decoded = jwt.verify(token, env.JWT_SECRET)

  const admin = await Admin.findById(decoded.id).select("-password")

  if (!admin) {
    res.status(401)
    throw new Error("Not authorized. Admin not found.")
  }

  if (!admin.isActive) {
    res.status(403)
    throw new Error("This admin account is disabled.")
  }

  req.admin = await normalizeAdminAccess(admin)

  next()
})

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      res.status(401)
      throw new Error("Not authorized.")
    }

    if (!roles.includes(req.admin.role)) {
      res.status(403)
      throw new Error("You do not have permission to perform this action.")
    }

    next()
  }
}

export const requirePermission = (module, action = "view") => {
  return (req, res, next) => {
    if (!req.admin) {
      res.status(401)
      throw new Error("Not authorized.")
    }

    if (req.admin.role === "superAdmin") {
      return next()
    }

    const hasAccess = Boolean(req.admin.permissions?.[module]?.[action])

    if (!hasAccess) {
      res.status(403)
      throw new Error("You do not have permission to perform this action.")
    }

    next()
  }
}

export const requireControlRoomAccess = (action = "view") => {
  return requirePermission("controlRoom", action)
}

export const requireLeadAccess = (action = "view") => {
  return requirePermission("leads", action)
}

export const requireFollowUpAccess = (action = "view") => {
  return requirePermission("followUps", action)
}

export const requireContactInquiryAccess = (action = "view") => {
  return requirePermission("contactInquiries", action)
}

export const requireNotificationAccess = (action = "view") => {
  return requirePermission("notifications", action)
}