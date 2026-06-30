import mongoose from "mongoose";
import slugify from "slugify";

export const TOUR_STATUSES = ["draft", "published", "archived"];

export const TOUR_CATEGORIES = [
  "family",
  "honeymoon",
  "adventure",
  "luxury",
  "cultural",
  "group",
  "customized",
  "other"
];

export const DESTINATION_TYPES = ["international", "domestic"];

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

const itineraryDaySchema = new mongoose.Schema(
  {
    day: {
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

const tourSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Tour title is required"],
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

    destination: {
      type: String,
      required: [true, "Destination is required"],
      trim: true
    },

    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true
    },

    city: {
      type: String,
      trim: true,
      default: ""
    },

    destinationType: {
      type: String,
      enum: DESTINATION_TYPES,
      default: "international"
    },

    category: {
      type: String,
      enum: TOUR_CATEGORIES,
      default: "family"
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

    durationDays: {
      type: Number,
      required: [true, "Duration days are required"],
      min: 1
    },

    nights: {
      type: Number,
      required: [true, "Nights are required"],
      min: 0
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

    departureCity: {
      type: String,
      trim: true,
      default: ""
    },

    isCustomizable: {
      type: Boolean,
      default: true
    },

    highlights: {
      type: [String],
      default: []
    },

    inclusions: {
      type: [String],
      default: []
    },

    exclusions: {
      type: [String],
      default: []
    },

    itinerary: {
      type: [itineraryDaySchema],
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
      enum: TOUR_STATUSES,
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

tourSchema.pre("validate", function () {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
      trim: true
    });
  }
});

tourSchema.index({ status: 1 });
tourSchema.index({ category: 1 });
tourSchema.index({ destinationType: 1 });
tourSchema.index({ country: 1 });
tourSchema.index({ isFeatured: 1 });
tourSchema.index({ createdAt: -1 });
tourSchema.index({
  title: "text",
  destination: "text",
  country: "text",
  city: "text",
  shortDescription: "text",
  description: "text"
});

const Tour = mongoose.model("Tour", tourSchema);

export default Tour;