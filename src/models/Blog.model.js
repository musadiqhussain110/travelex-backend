import mongoose from "mongoose";
import slugify from "slugify";

export const BLOG_STATUSES = ["draft", "published", "archived"];

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

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
      maxlength: [180, "Title cannot exceed 180 characters"]
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    excerpt: {
      type: String,
      required: [true, "Blog excerpt is required"],
      trim: true,
      maxlength: [350, "Excerpt cannot exceed 350 characters"]
    },

    content: {
      type: String,
      required: [true, "Blog content is required"],
      trim: true
    },

    category: {
      type: String,
      required: [true, "Blog category is required"],
      trim: true
    },

    tags: {
      type: [String],
      default: []
    },

    coverImage: {
      type: imageSchema,
      default: () => ({})
    },

    authorName: {
      type: String,
      trim: true,
      default: "TravelEx Team"
    },

    isFeatured: {
      type: Boolean,
      default: false
    },

    status: {
      type: String,
      enum: BLOG_STATUSES,
      default: "draft"
    },

    publishedAt: {
      type: Date,
      default: null
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

blogSchema.pre("validate", function () {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
      trim: true
    });
  }

  if (this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

blogSchema.index({ status: 1 });
blogSchema.index({ category: 1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ isFeatured: 1 });
blogSchema.index({ publishedAt: -1 });
blogSchema.index({ createdAt: -1 });
blogSchema.index({
  title: "text",
  excerpt: "text",
  content: "text",
  category: "text",
  tags: "text"
});

const Blog = mongoose.model("Blog", blogSchema);

export default Blog;