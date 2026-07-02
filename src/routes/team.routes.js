import express from "express"

import {
  getTeamAccessOptions,
  listTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  updateTeamMemberStatus,
  resetTeamMemberPassword,
} from "../controllers/team.controller.js"

import {
  protect,
  requireControlRoomAccess,
} from "../middleware/auth.middleware.js"

import { validate } from "../middleware/validate.middleware.js"

import {
  listTeamMembersQuerySchema,
  teamMemberIdParamSchema,
  createTeamMemberSchema,
  updateTeamMemberSchema,
  updateTeamMemberStatusSchema,
  resetTeamMemberPasswordSchema,
} from "../validations/team.validation.js"

const router = express.Router()

router.use(protect)

router.get(
  "/access-options",
  requireControlRoomAccess("view"),
  getTeamAccessOptions
)

router.get(
  "/",
  requireControlRoomAccess("view"),
  validate(listTeamMembersQuerySchema),
  listTeamMembers
)

router.post(
  "/",
  requireControlRoomAccess("createMembers"),
  validate(createTeamMemberSchema),
  createTeamMember
)

router.get(
  "/:id",
  requireControlRoomAccess("view"),
  validate(teamMemberIdParamSchema),
  getTeamMemberById
)

router.patch(
  "/:id",
  requireControlRoomAccess("updateMembers"),
  validate(updateTeamMemberSchema),
  updateTeamMember
)

router.patch(
  "/:id/status",
  requireControlRoomAccess("deactivateMembers"),
  validate(updateTeamMemberStatusSchema),
  updateTeamMemberStatus
)

router.patch(
  "/:id/reset-password",
  requireControlRoomAccess("updateMembers"),
  validate(resetTeamMemberPasswordSchema),
  resetTeamMemberPassword
)

export default router