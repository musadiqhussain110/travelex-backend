import mongoose from "mongoose";
import slugify from "slugify";

export const PACKAGE_STATUSES = ["draft", "published", "archived"];

export const UMRAH_PACKAGE_TYPES = [
  "economy",
  "standard",
  "premium",
  "vip"
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

const hotelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: ""
    },

    rating: {
      type: String,
      trim: true,
      default: ""
    },

    distance: {
      type: String,
      trim: true,
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

const umrahPackageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Package title is required"],
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

    makkahNights: {
      type: Number,
      required: [true, "Makkah nights are required"],
      min: 0
    },

    madinahNights: {
      type: Number,
      required: [true, "Madinah nights are required"],
      min: 0
    },

    packageType: {
      type: String,
      enum: UMRAH_PACKAGE_TYPES,
      default: "standard"
    },

    hotelCategory: {
      type: String,
      enum: ["3-star", "4-star", "5-star", "custom"],
      default: "3-star"
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

    airline: {
      type: String,
      trim: true,
      default: ""
    },

    hotels: {
      makkah: hotelSchema,
      madinah: hotelSchema
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
      enum: PACKAGE_STATUSES,
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

umrahPackageSchema.pre("validate", function () {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
      trim: true
    });
  }
});

umrahPackageSchema.index({ status: 1 });
umrahPackageSchema.index({ packageType: 1 });
umrahPackageSchema.index({ isFeatured: 1 });
umrahPackageSchema.index({ createdAt: -1 });
umrahPackageSchema.index({
  title: "text",
  shortDescription: "text",
  description: "text"
});

const UmrahPackage = mongoose.model("UmrahPackage", umrahPackageSchema);

export default UmrahPackage;