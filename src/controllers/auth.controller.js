import Admin from "../models/Admin.model.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { generateToken } from "../utils/generateToken.js"

const getSafeAdminPayload = (admin) => {
  const permissions =
    admin.permissions && Object.keys(admin.permissions).length
      ? admin.permissions
      : Admin.getDefaultPermissions(admin.role)

  return {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    permissions,
    isActive: admin.isActive,
    lastLogin: admin.lastLogin,
    createdAt: admin.createdAt,
  }
}

export const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body

  const normalizedEmail = email.toLowerCase().trim()

  const admin = await Admin.findOne({
    email: normalizedEmail,
  }).select("+password")

  if (!admin) {
    res.status(401)
    throw new Error("Invalid email or password.")
  }

  if (!admin.isActive) {
    res.status(403)
    throw new Error("Your admin account has been disabled.")
  }

  const isPasswordCorrect = await admin.comparePassword(password)

  if (!isPasswordCorrect) {
    res.status(401)
    throw new Error("Invalid email or password.")
  }

  // Safe migration for old staff accounts
  if (admin.role === "staff") {
    admin.role = "consultant"
    admin.permissions = Admin.getDefaultPermissions("consultant")
  }

  // Add default permissions for old admin accounts
  if (!admin.permissions || Object.keys(admin.permissions).length === 0) {
    admin.permissions = Admin.getDefaultPermissions(admin.role)
  }

  admin.lastLogin = new Date()
  admin.lastLoginIp = req.ip || ""
  admin.lastLoginUserAgent = req.get("user-agent") || ""

  await admin.save()

  const token = generateToken(admin)

  res.status(200).json({
    success: true,
    message: "Login successful.",
    token,
    admin: getSafeAdminPayload(admin),
  })
})

export const getAdminProfile = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin._id)

  if (!admin || !admin.isActive) {
    res.status(401)
    throw new Error("Admin account is not active.")
  }

  // Safe migration for old staff accounts
  if (admin.role === "staff") {
    admin.role = "consultant"
    admin.permissions = Admin.getDefaultPermissions("consultant")
    await admin.save()
  }

  // Add default permissions for old admin accounts
  if (!admin.permissions || Object.keys(admin.permissions).length === 0) {
    admin.permissions = Admin.getDefaultPermissions(admin.role)
    await admin.save()
  }

  res.status(200).json({
    success: true,
    admin: getSafeAdminPayload(admin),
  })
})