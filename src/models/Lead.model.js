import mongoose from "mongoose"

export const LEAD_STATUSES = [
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
]

export const SERVICE_TYPES = [
  "umrah",
  "tour",
  "visa",
  "hotel",
  "carRental",
  "ticket",
  "contact",
  "general",
]

export const LEAD_SOURCES = [
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
]

const noteSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "Note text is required"],
      trim: true,
      maxlength: [2000, "Note cannot exceed 2000 characters"],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  }
)

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: LEAD_STATUSES,
      required: true,
    },

    changedAt: {
      type: Date,
      default: Date.now,
    },

    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  {
    _id: false,
  }
)

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      maxlength: [30, "Phone number cannot exceed 30 characters"],
    },

    serviceType: {
      type: String,
      enum: SERVICE_TYPES,
      required: [true, "Service type is required"],
    },

    source: {
      type: String,
      enum: LEAD_SOURCES,
      default: "homepage",
    },

    pageUrl: {
      type: String,
      trim: true,
      default: "",
    },

    packageRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UmrahPackage",
      default: null,
    },

    tourRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tour",
      default: null,
    },

    visaRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VisaService",
      default: null,
    },

    hotelRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      default: null,
    },

    carRentalRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CarRental",
      default: null,
    },

    city: {
      type: String,
      trim: true,
      maxlength: [100, "City cannot exceed 100 characters"],
      default: "",
    },

    nationality: {
      type: String,
      trim: true,
      maxlength: [100, "Nationality cannot exceed 100 characters"],
      default: "",
    },

    departureCity: {
      type: String,
      trim: true,
      maxlength: [150, "Departure city cannot exceed 150 characters"],
      default: "",
    },

    destinationCity: {
      type: String,
      trim: true,
      maxlength: [150, "Destination city cannot exceed 150 characters"],
      default: "",
    },

    destinationCountry: {
      type: String,
      trim: true,
      maxlength: [150, "Destination country cannot exceed 150 characters"],
      default: "",
    },

    destination: {
      type: String,
      trim: true,
      maxlength: [150, "Destination cannot exceed 150 characters"],
      default: "",
    },

    travelers: {
      adults: {
        type: Number,
        default: 1,
        min: 1,
      },
      children: {
        type: Number,
        default: 0,
        min: 0,
      },
      infants: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    numberOfApplicants: {
      type: Number,
      default: 1,
      min: 1,
    },

    travelDate: {
      type: Date,
      default: null,
    },

    returnDate: {
      type: Date,
      default: null,
    },

    durationOfStay: {
      type: String,
      trim: true,
      maxlength: [100, "Duration of stay cannot exceed 100 characters"],
      default: "",
    },

    packageRequired: {
      type: String,
      trim: true,
      maxlength: [100, "Package required cannot exceed 100 characters"],
      default: "",
    },

    hotelCategory: {
      type: String,
      trim: true,
      maxlength: [100, "Hotel category cannot exceed 100 characters"],
      default: "",
    },

    preferredHotel: {
      type: String,
      trim: true,
      maxlength: [150, "Preferred hotel cannot exceed 150 characters"],
      default: "",
    },

    visaRequired: {
      type: String,
      trim: true,
      maxlength: [20, "Visa required cannot exceed 20 characters"],
      default: "",
    },

    visaType: {
      type: String,
      trim: true,
      maxlength: [100, "Visa type cannot exceed 100 characters"],
      default: "",
    },

    interestedIn: {
      type: String,
      trim: true,
      maxlength: [100, "Interested in cannot exceed 100 characters"],
      default: "",
    },

    preferredAirline: {
      type: String,
      trim: true,
      maxlength: [100, "Preferred airline cannot exceed 100 characters"],
      default: "",
    },

    travelClass: {
      type: String,
      trim: true,
      maxlength: [100, "Travel class cannot exceed 100 characters"],
      default: "",
    },

    traveledAbroadBefore: {
      type: String,
      trim: true,
      maxlength: [20, "Travel history answer cannot exceed 20 characters"],
      default: "",
    },

    visaRefusedBefore: {
      type: String,
      trim: true,
      maxlength: [20, "Visa refusal answer cannot exceed 20 characters"],
      default: "",
    },

    currentOccupation: {
      type: String,
      trim: true,
      maxlength: [150, "Current occupation cannot exceed 150 characters"],
      default: "",
    },

    monthlyIncome: {
      type: String,
      trim: true,
      maxlength: [100, "Monthly income cannot exceed 100 characters"],
      default: "",
    },

    flightBookingAssistance: {
      type: String,
      trim: true,
      maxlength: [20, "Flight booking assistance answer cannot exceed 20 characters"],
      default: "",
    },

    hotelBookingAssistance: {
      type: String,
      trim: true,
      maxlength: [20, "Hotel booking assistance answer cannot exceed 20 characters"],
      default: "",
    },

    // Hotel booking inquiry fields
    checkInDate: {
      type: Date,
      default: null,
    },

    checkOutDate: {
      type: Date,
      default: null,
    },

    numberOfRooms: {
      type: Number,
      default: 1,
      min: 1,
    },

    numberOfGuests: {
      type: Number,
      default: 1,
      min: 1,
    },

    roomType: {
      type: String,
      trim: true,
      maxlength: [100, "Room type cannot exceed 100 characters"],
      default: "",
    },

    mealPlan: {
      type: String,
      trim: true,
      maxlength: [100, "Meal plan cannot exceed 100 characters"],
      default: "",
    },

    bookingReference: {
      type: String,
      trim: true,
      maxlength: [100, "Booking reference cannot exceed 100 characters"],
      default: "",
    },

    paymentMethod: {
      type: String,
      trim: true,
      maxlength: [100, "Payment method cannot exceed 100 characters"],
      default: "",
    },

    estimatedTotal: {
      type: String,
      trim: true,
      maxlength: [100, "Estimated total cannot exceed 100 characters"],
      default: "",
    },

    // Car rental inquiry fields
    pickupDate: {
      type: Date,
      default: null,
    },

    pickupTime: {
      type: String,
      trim: true,
      maxlength: [50, "Pickup time cannot exceed 50 characters"],
      default: "",
    },

    returnTime: {
      type: String,
      trim: true,
      maxlength: [50, "Return time cannot exceed 50 characters"],
      default: "",
    },

    vehicleType: {
      type: String,
      trim: true,
      maxlength: [100, "Vehicle type cannot exceed 100 characters"],
      default: "",
    },

    rentalType: {
      type: String,
      trim: true,
      maxlength: [100, "Rental type cannot exceed 100 characters"],
      default: "",
    },

    driverOption: {
      type: String,
      trim: true,
      maxlength: [100, "Driver option cannot exceed 100 characters"],
      default: "",
    },

    passengerCount: {
      type: Number,
      default: 1,
      min: 1,
    },

    luggage: {
      type: String,
      trim: true,
      maxlength: [100, "Luggage cannot exceed 100 characters"],
      default: "",
    },

    budget: {
      type: String,
      trim: true,
      maxlength: [100, "Budget cannot exceed 100 characters"],
      default: "",
    },

    makkahNights: {
      type: Number,
      default: 0,
      min: 0,
    },

    madinahNights: {
      type: Number,
      default: 0,
      min: 0,
    },

    pickupLocation: {
      type: String,
      trim: true,
      maxlength: [200, "Pickup location cannot exceed 200 characters"],
      default: "",
    },

    dropoffLocation: {
      type: String,
      trim: true,
      maxlength: [200, "Drop-off location cannot exceed 200 characters"],
      default: "",
    },

    additionalRequirements: {
      type: String,
      trim: true,
      maxlength: [3000, "Additional requirements cannot exceed 3000 characters"],
      default: "",
    },

    message: {
      type: String,
      trim: true,
      maxlength: [3000, "Message cannot exceed 3000 characters"],
      default: "",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    notes: [noteSchema],

    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: "New",
    },

    statusHistory: [statusHistorySchema],

    followUpDate: {
      type: Date,
      default: null,
    },

    isArchived: {
      type: Boolean,
      default: false,
    },

    ipAddress: {
      type: String,
      default: "",
    },

    userAgent: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
)

leadSchema.pre("save", function () {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
      changedBy: null,
    })
  }
})

leadSchema.index({ status: 1 })
leadSchema.index({ serviceType: 1 })
leadSchema.index({ source: 1 })
leadSchema.index({ priority: 1 })
leadSchema.index({ assignedTo: 1 })
leadSchema.index({ followUpDate: 1 })
leadSchema.index({ createdAt: -1 })
leadSchema.index({
  name: "text",
  email: "text",
  phone: "text",
  city: "text",
  nationality: "text",
  departureCity: "text",
  destinationCity: "text",
  destinationCountry: "text",
  destination: "text",
  visaType: "text",
  preferredAirline: "text",
  currentOccupation: "text",

  bookingReference: "text",
  roomType: "text",
  mealPlan: "text",
  vehicleType: "text",
  rentalType: "text",
  driverOption: "text",
  message: "text",
  additionalRequirements: "text",
})

const Lead = mongoose.model("Lead", leadSchema)

export default Lead
