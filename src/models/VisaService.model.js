import mongoose from "mongoose";
import slugify from "slugify";

export const VISA_SERVICE_STATUSES = ["draft", "published", "archived"];

export const VISA_TYPES = [
  "tourist",
  "visit",
  "business",
  "student",
  "work",
  "family",
  "transit",
  "other"
];

const imageSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      default: ""
    },

    publicId: {
      type: String,
      default: ""
    }
  },
  {
    _id: false
  }
);

const processStepSchema = new mongoose.Schema(
  {
    step: {
      type: Number,
      required: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    _id: false
  }
);

const visaServiceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Visa service title is required"],
      trim: true,
      maxlength: [160, "Title cannot exceed 160 characters"]
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true
    },

    visaType: {
      type: String,
      enum: VISA_TYPES,
      default: "tourist"
    },

    shortDescription: {
      type: String,
      trim: true,
      maxlength: [300, "Short description cannot exceed 300 characters"],
      default: ""
    },

    description: {
      type: String,
      trim: true,
      maxlength: [5000, "Description cannot exceed 5000 characters"],
      default: ""
    },

    priceFrom: {
      type: Number,
      required: [true, "Starting price is required"],
      min: 0
    },

    currency: {
      type: String,
      default: "PKR"
    },

    processingTime: {
      type: String,
      trim: true,
      default: ""
    },

    validity: {
      type: String,
      trim: true,
      default: ""
    },

    stayDuration: {
      type: String,
      trim: true,
      default: ""
    },

    requirements: {
      type: [String],
      default: []
    },

    documentsRequired: {
      type: [String],
      default: []
    },

    processSteps: {
      type: [processStepSchema],
      default: []
    },

    importantNotes: {
      type: [String],
      default: []
    },

    image: {
      type: imageSchema,
      default: () => ({})
    },

    gallery: {
      type: [imageSchema],
      default: []
    },

    isFeatured: {
      type: Boolean,
      default: false
    },

    status: {
      type: String,
      enum: VISA_SERVICE_STATUSES,
      default: "draft"
    },

    metaTitle: {
      type: String,
      trim: true,
      maxlength: [160, "Meta title cannot exceed 160 characters"],
      default: ""
    },

    metaDescription: {
      type: String,
      trim: true,
      maxlength: [300, "Meta description cannot exceed 300 characters"],
      default: ""
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null
    }
  },
  {
    timestamps: true
  }
);

visaServiceSchema.pre("validate", function () {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
      trim: true
    });
  }
});

visaServiceSchema.index({ status: 1 });
visaServiceSchema.index({ country: 1 });
visaServiceSchema.index({ visaType: 1 });
visaServiceSchema.index({ isFeatured: 1 });
visaServiceSchema.index({ createdAt: -1 });
visaServiceSchema.index({
  title: "text",
  country: "text",
  shortDescription: "text",
  description: "text"
});

const VisaService = mongoose.model("VisaService", visaServiceSchema);

export default VisaService;