import mongoose from "mongoose";
import slugify from "slugify";

export const FAQ_STATUSES = ["draft", "published", "archived"];

export const FAQ_PAGE_TYPES = [
  "homepage",
  "umrah",
  "tour",
  "visa",
  "contact",
  "general"
];

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "FAQ question is required"],
      trim: true,
      maxlength: [250, "Question cannot exceed 250 characters"]
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    answer: {
      type: String,
      required: [true, "FAQ answer is required"],
      trim: true,
      maxlength: [3000, "Answer cannot exceed 3000 characters"]
    },

    pageType: {
      type: String,
      enum: FAQ_PAGE_TYPES,
      default: "general"
    },

    category: {
      type: String,
      trim: true,
      default: "General"
    },

    order: {
      type: Number,
      default: 0
    },

    isFeatured: {
      type: Boolean,
      default: false
    },

    status: {
      type: String,
      enum: FAQ_STATUSES,
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

faqSchema.pre("validate", function () {
  if (!this.slug && this.question) {
    this.slug = slugify(this.question, {
      lower: true,
      strict: true,
      trim: true
    });
  }
});

faqSchema.index({ status: 1 });
faqSchema.index({ pageType: 1 });
faqSchema.index({ category: 1 });
faqSchema.index({ order: 1 });
faqSchema.index({ isFeatured: 1 });
faqSchema.index({ createdAt: -1 });
faqSchema.index({
  question: "text",
  answer: "text",
  category: "text"
});

const Faq = mongoose.model("Faq", faqSchema);

export default Faq;