import mongoose from "mongoose";

export const CONTACT_INQUIRY_STATUSES = [
  "New",
  "Read",
  "Replied",
  "Closed",
  "Spam"
];

export const CONTACT_INQUIRY_SOURCES = [
  "contact-page",
  "homepage",
  "footer",
  "support-section",
  "manual",
  "other"
];

const noteSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "Note text is required"],
      trim: true,
      maxlength: [2000, "Note cannot exceed 2000 characters"]
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true
    },

    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    _id: true
  }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: CONTACT_INQUIRY_STATUSES,
      required: true
    },

    changedAt: {
      type: Date,
      default: Date.now
    },

    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null
    }
  },
  {
    _id: false
  }
);

const leadSourceSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      trim: true,
      maxlength: [100, "Lead source cannot exceed 100 characters"],
      default: "direct"
    },

    medium: {
      type: String,
      trim: true,
      maxlength: [100, "Lead medium cannot exceed 100 characters"],
      default: ""
    },

    campaign: {
      type: String,
      trim: true,
      maxlength: [150, "Lead campaign cannot exceed 150 characters"],
      default: ""
    },

    content: {
      type: String,
      trim: true,
      maxlength: [150, "Lead content cannot exceed 150 characters"],
      default: ""
    },

    term: {
      type: String,
      trim: true,
      maxlength: [150, "Lead term cannot exceed 150 characters"],
      default: ""
    },

    referrer: {
      type: String,
      trim: true,
      maxlength: [1000, "Referrer cannot exceed 1000 characters"],
      default: ""
    },

    landingPage: {
      type: String,
      trim: true,
      maxlength: [1000, "Landing page cannot exceed 1000 characters"],
      default: ""
    },

    landingPath: {
      type: String,
      trim: true,
      maxlength: [300, "Landing path cannot exceed 300 characters"],
      default: ""
    },

    formPage: {
      type: String,
      trim: true,
      maxlength: [1000, "Form page cannot exceed 1000 characters"],
      default: ""
    },

    formPath: {
      type: String,
      trim: true,
      maxlength: [300, "Form path cannot exceed 300 characters"],
      default: ""
    },

    capturedAt: {
      type: Date,
      default: null
    },

    submittedAt: {
      type: Date,
      default: null
    }
  },
  {
    _id: false
  }
);

const contactInquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"]
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      maxlength: [30, "Phone number cannot exceed 30 characters"]
    },

    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      maxlength: [160, "Subject cannot exceed 160 characters"]
    },

    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [3000, "Message cannot exceed 3000 characters"]
    },

    source: {
      type: String,
      enum: CONTACT_INQUIRY_SOURCES,
      default: "contact-page"
    },

    leadSource: {
      type: leadSourceSchema,
      default: () => ({})
    },

    pageUrl: {
      type: String,
      trim: true,
      default: ""
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null
    },

    notes: [noteSchema],

    status: {
      type: String,
      enum: CONTACT_INQUIRY_STATUSES,
      default: "New"
    },

    statusHistory: [statusHistorySchema],

    isArchived: {
      type: Boolean,
      default: false
    },

    ipAddress: {
      type: String,
      default: ""
    },

    userAgent: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

contactInquirySchema.pre("save", function () {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
      changedBy: null
    });
  }
});

contactInquirySchema.index({ status: 1 });
contactInquirySchema.index({ source: 1 });
contactInquirySchema.index({ assignedTo: 1 });
contactInquirySchema.index({ createdAt: -1 });

contactInquirySchema.index({ "leadSource.source": 1, createdAt: -1 });
contactInquirySchema.index({ "leadSource.medium": 1, createdAt: -1 });
contactInquirySchema.index({ "leadSource.campaign": 1, createdAt: -1 });

contactInquirySchema.index({
  name: "text",
  email: "text",
  phone: "text",
  subject: "text",
  message: "text",
});

const ContactInquiry = mongoose.model(
  "ContactInquiry",
  contactInquirySchema
);

export default ContactInquiry;