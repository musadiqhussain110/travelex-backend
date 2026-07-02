import Admin from "../models/Admin.model.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

const roleLabels = {
  superAdmin: "Super Admin",
  admin: "Admin",
  consultant: "Consultant",
  viewer: "Viewer",
}

const escapeRegex = (value = "") => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

const getPositiveNumber = (value, fallback) => {
  const number = Number(value)

  if (!Number.isFinite(number) || number < 1) {
    return fallback
  }

  return Math.floor(number)
}

const getPaginationParams = (page, limit) => {
  const safePage = getPositiveNumber(page, DEFAULT_PAGE)
  const requestedLimit = getPositiveNumber(limit, DEFAULT_LIMIT)
  const safeLimit = Math.min(requestedLimit, MAX_LIMIT)
  const skip = (safePage - 1) * safeLimit

  return {
    page: safePage,
    limit: safeLimit,
    skip,
  }
}

const buildPaginationMeta = ({ total, page, limit, count }) => {
  const totalPages = Math.max(Math.ceil(total / limit), 1)
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = total === 0 ? 0 : from + count - 1

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
    from,
    to,
  }
}

const throwError = (message, statusCode = 400) => {
  const error = new Error(message)
  error.statusCode = statusCode
  throw error
}

const getPermissionTemplate = () => {
  return Admin.getDefaultPermissions("superAdmin")
}

const normalizePermissionShape = (requestedPermissions, fallbackRole = "viewer") => {
  const template = getPermissionTemplate()
  const roleDefaults = Admin.getDefaultPermissions(fallbackRole)
  const normalized = {}

  Object.entries(template).forEach(([moduleName, moduleActions]) => {
    normalized[moduleName] = {}

    Object.entries(moduleActions || {}).forEach(([actionName]) => {
      const requestedValue =
        requestedPermissions?.[moduleName]?.[actionName]

      if (typeof requestedValue === "boolean") {
        normalized[moduleName][actionName] = requestedValue
        return
      }

      normalized[moduleName][actionName] = Boolean(
        roleDefaults?.[moduleName]?.[actionName]
      )
    })
  })

  return normalized
}

const limitPermissionsByActor = (
  actor,
  requestedPermissions,
  fallbackRole = "viewer"
) => {
  const normalizedPermissions = normalizePermissionShape(
    requestedPermissions,
    fallbackRole
  )

  if (actor.role === "superAdmin") {
    return normalizedPermissions
  }

  const limitedPermissions = {}

  Object.entries(normalizedPermissions).forEach(([moduleName, actions]) => {
    limitedPermissions[moduleName] = {}

    Object.entries(actions || {}).forEach(([actionName, value]) => {
      const actorCanDoThis = Boolean(
        actor.permissions?.[moduleName]?.[actionName]
      )

      limitedPermissions[moduleName][actionName] = Boolean(
        value && actorCanDoThis
      )
    })
  })

  return limitedPermissions
}

const getSafeMemberPayload = (member) => {
  return {
    id: member._id,
    _id: member._id,
    name: member.name,
    email: member.email,
    role: member.role,
    roleLabel: roleLabels[member.role] || member.role,
    permissions: normalizePermissionShape(member.permissions, member.role),
    isActive: member.isActive,
    lastLogin: member.lastLogin,
    lastLoginIp: member.lastLoginIp,
    createdBy: member.createdBy,
    updatedBy: member.updatedBy,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  }
}

const ensureCanManageTargetMember = ({ actor, targetMember, nextRole }) => {
  if (actor.role === "superAdmin") return

  if (targetMember?.role === "superAdmin" || nextRole === "superAdmin") {
    throwError("Only Super Admin can manage Super Admin accounts.", 403)
  }
}

const ensureNotSelfDeactivate = ({ actor, targetId, isActive }) => {
  if (String(actor._id) === String(targetId) && isActive === false) {
    throwError("You cannot deactivate your own account.", 400)
  }
}

const ensureLastSuperAdminNotDisabled = async ({ targetMember, isActive }) => {
  if (targetMember.role !== "superAdmin" || isActive !== false) return

  const activeSuperAdmins = await Admin.countDocuments({
    role: "superAdmin",
    isActive: true,
  })

  if (activeSuperAdmins <= 1) {
    throwError("At least one active Super Admin is required.", 400)
  }
}

export const getTeamAccessOptions = asyncHandler(async (req, res) => {
  const roles = ["superAdmin", "admin", "consultant", "viewer"].map((role) => ({
    value: role,
    label: roleLabels[role],
    permissions: normalizePermissionShape(null, role),
  }))

  res.status(200).json({
    success: true,
    roles,
  })
})

export const listTeamMembers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(
    req.validated.query.page,
    req.validated.query.limit
  )

  const { search, role, isActive } = req.validated.query

  const filter = {}

  if (role) {
    filter.role = role
  }

  if (typeof isActive === "boolean") {
    filter.isActive = isActive
  }

  if (search?.trim()) {
    const safeSearch = escapeRegex(search.trim())

    filter.$or = [
      { name: { $regex: safeSearch, $options: "i" } },
      { email: { $regex: safeSearch, $options: "i" } },
      { role: { $regex: safeSearch, $options: "i" } },
    ]
  }

  const [members, total] = await Promise.all([
    Admin.find(filter)
      .select("-password")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Admin.countDocuments(filter),
  ])

  const safeMembers = members.map(getSafeMemberPayload)

  const pagination = buildPaginationMeta({
    total,
    page,
    limit,
    count: safeMembers.length,
  })

  res.status(200).json({
    success: true,
    count: safeMembers.length,
    total,
    members: safeMembers,
    pagination,
    data: {
      members: safeMembers,
      pagination,
    },
  })
})

export const getTeamMemberById = asyncHandler(async (req, res) => {
  const { id } = req.validated.params

  const member = await Admin.findById(id)
    .select("-password")
    .populate("createdBy", "name email role")
    .populate("updatedBy", "name email role")

  if (!member) {
    res.status(404)
    throw new Error("Team member not found.")
  }

  ensureCanManageTargetMember({
    actor: req.admin,
    targetMember: member,
  })

  res.status(200).json({
    success: true,
    member: getSafeMemberPayload(member),
  })
})

export const createTeamMember = asyncHandler(async (req, res) => {
  const { name, email, password, role, permissions } = req.validated.body

  const selectedRole = role || "consultant"

  if (selectedRole === "superAdmin" && req.admin.role !== "superAdmin") {
    res.status(403)
    throw new Error("Only Super Admin can create another Super Admin.")
  }

  const normalizedEmail = email.toLowerCase().trim()

  const existingMember = await Admin.findOne({ email: normalizedEmail })

  if (existingMember) {
    res.status(409)
    throw new Error("A team member with this email already exists.")
  }

  const safePermissions = limitPermissionsByActor(
    req.admin,
    permissions,
    selectedRole
  )

  const member = await Admin.create({
    name,
    email: normalizedEmail,
    password,
    role: selectedRole,
    permissions: safePermissions,
    createdBy: req.admin._id,
    updatedBy: req.admin._id,
  })

  res.status(201).json({
    success: true,
    message: "Team member created successfully.",
    member: getSafeMemberPayload(member),
  })
})

export const updateTeamMember = asyncHandler(async (req, res) => {
  const { id } = req.validated.params
  const { name, email, role, permissions, isActive } = req.validated.body

  const member = await Admin.findById(id)

  if (!member) {
    res.status(404)
    throw new Error("Team member not found.")
  }

  ensureCanManageTargetMember({
    actor: req.admin,
    targetMember: member,
    nextRole: role,
  })

  ensureNotSelfDeactivate({
    actor: req.admin,
    targetId: member._id,
    isActive,
  })

  await ensureLastSuperAdminNotDisabled({
    targetMember: member,
    isActive,
  })

  if (email) {
    const normalizedEmail = email.toLowerCase().trim()

    const duplicateEmail = await Admin.findOne({
      email: normalizedEmail,
      _id: { $ne: member._id },
    })

    if (duplicateEmail) {
      res.status(409)
      throw new Error("Another team member already uses this email.")
    }

    member.email = normalizedEmail
  }

  if (name !== undefined) {
    member.name = name
  }

  if (role !== undefined) {
    member.role = role
    member.permissions = limitPermissionsByActor(
      req.admin,
      permissions,
      role
    )
  } else if (permissions !== undefined) {
    member.permissions = limitPermissionsByActor(
      req.admin,
      permissions,
      member.role
    )
  }

  if (isActive !== undefined) {
    member.isActive = isActive
  }

  member.updatedBy = req.admin._id

  await member.save()

  const updatedMember = await Admin.findById(member._id)
    .select("-password")
    .populate("createdBy", "name email role")
    .populate("updatedBy", "name email role")

  res.status(200).json({
    success: true,
    message: "Team member updated successfully.",
    member: getSafeMemberPayload(updatedMember),
  })
})

export const updateTeamMemberStatus = asyncHandler(async (req, res) => {
  const { id } = req.validated.params
  const { isActive } = req.validated.body

  const member = await Admin.findById(id)

  if (!member) {
    res.status(404)
    throw new Error("Team member not found.")
  }

  ensureCanManageTargetMember({
    actor: req.admin,
    targetMember: member,
  })

  ensureNotSelfDeactivate({
    actor: req.admin,
    targetId: member._id,
    isActive,
  })

  await ensureLastSuperAdminNotDisabled({
    targetMember: member,
    isActive,
  })

  member.isActive = isActive
  member.updatedBy = req.admin._id

  await member.save()

  res.status(200).json({
    success: true,
    message: isActive
      ? "Team member activated successfully."
      : "Team member deactivated successfully.",
    member: getSafeMemberPayload(member),
  })
})

export const resetTeamMemberPassword = asyncHandler(async (req, res) => {
  const { id } = req.validated.params
  const { password } = req.validated.body

  const member = await Admin.findById(id)

  if (!member) {
    res.status(404)
    throw new Error("Team member not found.")
  }

  ensureCanManageTargetMember({
    actor: req.admin,
    targetMember: member,
  })

  if (String(req.admin._id) === String(member._id)) {
    throwError("Use profile settings to change your own password.", 400)
  }

  member.password = password
  member.updatedBy = req.admin._id

  await member.save()

  res.status(200).json({
    success: true,
    message: "Team member password reset successfully.",
  })
})