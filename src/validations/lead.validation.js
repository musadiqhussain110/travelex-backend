import { z } from "zod"

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId")

const optionalObjectId = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  objectIdSchema.optional()
)

const optionalDate = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.date().optional()
)

const nullableOptionalDate = z.preprocess(
  (value) => (value === "" || value === null ? null : value),
  z.coerce.date().nullable().optional()
)

const optionalString = (max = 250, defaultValue = "") =>
  z
    .string()
    .trim()
    .max(max, `Cannot exceed ${max} characters`)
    .optional()
    .default(defaultValue)

const optionalPositiveInt = (defaultValue = 1) =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().int().min(1).optional().default(defaultValue)
  )

const leadStatusSchema = z.enum([
  "New",
  "Contacted",
  "Interested",
  "Awaiting Documents",
  "Quoted",
  "Payment Pending",
  "Confirmed",
  "Booked",
  "Lost",
  "Cancelled",
])

const serviceTypeSchema = z.enum([
  "umrah",
  "tour",
  "visa",
  "hotel",
  "carRental",
  "ticket",
  "contact",
  "general",
])

const sourceSchema = z.enum([
  "homepage",
  "umrah-page",
  "tour-page",
  "visa-page",
  "hotel-page",
  "car-rental-page",
  "ticket-page",
  "contact-page",
  "hero-banner",
  "lead-modal",
  "whatsapp",
  "manual",
  "other",
])

const prioritySchema = z.enum(["low", "medium", "high", "urgent"])

const followUpStatusSchema = z.enum([
  "Not Set",
  "Scheduled",
  "Completed",
  "Cancelled",
])

export const createLeadSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters"),

    email: z
      .string()
      .trim()
      .email("Please enter a valid email address")
      .toLowerCase(),

    phone: z
      .string()
      .trim()
      .min(7, "Phone number is too short")
      .max(30, "Phone number is too long"),

    serviceType: serviceTypeSchema,

    source: sourceSchema.default("homepage"),

    pageUrl: optionalString(500),

    packageRef: optionalObjectId,
    tourRef: optionalObjectId,
    visaRef: optionalObjectId,
    hotelRef: optionalObjectId,
    carRentalRef: optionalObjectId,

    city: optionalString(100),
    nationality: optionalString(100),
    departureCity: optionalString(150),
    destinationCity: optionalString(150),
    destinationCountry: optionalString(150),
    destination: optionalString(150),

    travelers: z
      .object({
        adults: z.coerce.number().int().min(1).default(1),
        children: z.coerce.number().int().min(0).default(0),
        infants: z.coerce.number().int().min(0).default(0),
      })
      .optional(),

    numberOfApplicants: optionalPositiveInt(1),

    travelDate: optionalDate,
    returnDate: optionalDate,

    durationOfStay: optionalString(100),
    packageRequired: optionalString(100),
    hotelCategory: optionalString(100),
    preferredHotel: optionalString(150),
    visaRequired: optionalString(20),
    visaType: optionalString(100),
    interestedIn: optionalString(100),
    preferredAirline: optionalString(100),
    travelClass: optionalString(100),
    traveledAbroadBefore: optionalString(20),
    visaRefusedBefore: optionalString(20),
    currentOccupation: optionalString(150),
    monthlyIncome: optionalString(100),
    flightBookingAssistance: optionalString(20),
    hotelBookingAssistance: optionalString(20),

    checkInDate: optionalDate,
    checkOutDate: optionalDate,
    numberOfRooms: optionalPositiveInt(1),
    numberOfGuests: optionalPositiveInt(1),
    roomType: optionalString(100),
    mealPlan: optionalString(100),
    bookingReference: optionalString(100),
    paymentMethod: optionalString(100),
    estimatedTotal: optionalString(100),

    pickupDate: optionalDate,
    pickupTime: optionalString(50),
    returnTime: optionalString(50),
    vehicleType: optionalString(100),
    rentalType: optionalString(100),
    driverOption: optionalString(100),
    passengerCount: optionalPositiveInt(1),
    luggage: optionalString(100),

    budget: optionalString(100),

    makkahNights: z.coerce.number().int().min(0).optional().default(0),
    madinahNights: z.coerce.number().int().min(0).optional().default(0),

    pickupLocation: optionalString(200),
    dropoffLocation: optionalString(200),

    additionalRequirements: optionalString(3000),

    message: optionalString(3000),

    priority: prioritySchema.optional().default("medium"),

    companyWebsite: z.string().optional().default(""),
  }),
})

export const getLeadsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),

    search: z.string().trim().optional().default(""),

    status: leadStatusSchema.optional(),
    serviceType: serviceTypeSchema.optional(),
    source: sourceSchema.optional(),
    priority: prioritySchema.optional(),

    followUpStatus: followUpStatusSchema.optional(),
    followUp: z.enum(["today", "overdue", "upcoming", "none"]).optional(),

    assignedTo: optionalObjectId,

    includeArchived: z
      .preprocess((value) => value === "true", z.boolean())
      .optional()
      .default(false),

    sort: z
      .enum([
        "-createdAt",
        "createdAt",
        "-updatedAt",
        "updatedAt",
        "status",
        "-status",
        "serviceType",
        "-serviceType",
        "priority",
        "-priority",
        "followUpDate",
        "-followUpDate",
      ])
      .optional()
      .default("-createdAt"),
  }),
})

export const leadIdParamSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
})

export const updateLeadStatusSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),

  body: z.object({
    status: leadStatusSchema,
  }),
})

export const updateLeadFollowUpSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),

  body: z.object({
    followUpDate: nullableOptionalDate,
    followUpTime: z.string().trim().max(50).optional(),
    followUpNote: z.string().trim().max(1000).optional(),
    followUpStatus: followUpStatusSchema.optional(),
  }),
})

export const addLeadNoteSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),

  body: z.object({
    text: z
      .string()
      .trim()
      .min(2, "Note must be at least 2 characters")
      .max(2000, "Note cannot exceed 2000 characters"),
  }),
})

export const assignLeadSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),

  body: z.object({
    assignedTo: objectIdSchema,
  }),
})