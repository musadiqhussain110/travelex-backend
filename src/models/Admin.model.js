import mongoose from "mongoose"
import bcrypt from "bcryptjs"

const defaultPermissionsByRole = {
  superAdmin: {
    dashboard: { view: true },
    leads: {
      view: true,
      update: true,
      assign: true,
      archive: true,
      export: true,
    },
    followUps: { view: true, update: true },
    contactInquiries: { view: true, update: true, archive: true },
    notifications: { view: true, update: true },
    controlRoom: {
      view: true,
      createMembers: true,
      updateMembers: true,
      deactivateMembers: true,
    },
  },

  admin: {
    dashboard: { view: true },
    leads: {
      view: true,
      update: true,
      assign: true,
      archive: true,
      export: true,
    },
    followUps: { view: true, update: true },
    contactInquiries: { view: true, update: true, archive: true },
    notifications: { view: true, update: true },
    controlRoom: {
      view: true,
      createMembers: true,
      updateMembers: true,
      deactivateMembers: false,
    },
  },

  consultant: {
    dashboard: { view: true },
    leads: {
      view: true,
      update: true,
      assign: false,
      archive: false,
      export: false,
    },
    followUps: { view: true, update: true },
    contactInquiries: { view: true, update: true, archive: false },
    notifications: { view: true, update: true },
    controlRoom: {
      view: false,
      createMembers: false,
      updateMembers: false,
      deactivateMembers: false,
    },
  },

  viewer: {
    dashboard: { view: true },
    leads: {
      view: true,
      update: false,
      assign: false,
      archive: false,
      export: false,
    },
    followUps: { view: true, update: false },
    contactInquiries: { view: true, update: false, archive: false },
    notifications: { view: true, update: false },
    controlRoom: {
      view: false,
      createMembers: false,
      updateMembers: false,
      deactivateMembers: false,
    },
  },
}

const getDefaultPermissions = (role = "admin") => {
  return defaultPermissionsByRole[role] || defaultPermissionsByRole.admin
}

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Admin name is required"],
      trim: true,
      maxlength: [80, "Name cannot exceed 80 characters"],
    },

    email: {
      type: String,
      required: [true, "Admin email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    role: {
      type: String,
      enum: ["superAdmin", "admin", "consultant", "viewer"],
      default: "admin",
    },

    permissions: {
      type: mongoose.Schema.Types.Mixed,
      default: function () {
        return getDefaultPermissions(this.role)
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    lastLoginIp: {
      type: String,
      default: "",
      trim: true,
    },

    lastLoginUserAgent: {
      type: String,
      default: "",
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

adminSchema.pre("validate", function () {
  if (!this.permissions || Object.keys(this.permissions).length === 0) {
    this.permissions = getDefaultPermissions(this.role)
  }
})

adminSchema.pre("save", async function () {
  if (!this.isModified("password")) return

  const salt = await bcrypt.genSalt(12)
  this.password = await bcrypt.hash(this.password, salt)
})

adminSchema.methods.comparePassword = async function (enteredPassword) {
  if (!enteredPassword || !this.password) return false

  return bcrypt.compare(enteredPassword, this.password)
}

adminSchema.methods.hasPermission = function (module, action = "view") {
  if (this.role === "superAdmin") return true

  return Boolean(this.permissions?.[module]?.[action])
}

adminSchema.methods.refreshRolePermissions = function () {
  this.permissions = getDefaultPermissions(this.role)
  return this.permissions
}

adminSchema.statics.getDefaultPermissions = getDefaultPermissions

adminSchema.index({ role: 1, isActive: 1 })
adminSchema.index({ createdAt: -1 })

adminSchema.set("toJSON", {
  transform: function (doc, ret) {
    delete ret.password
    return ret
  },
})

const Admin = mongoose.model("Admin", adminSchema)

export default Admin