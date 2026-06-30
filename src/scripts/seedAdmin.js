import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin from "../models/Admin.model.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env");
    }

    if (!process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD) {
      throw new Error(
        "SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD is missing in .env"
      );
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected.");

    const existingAdmin = await Admin.findOne({
      email: process.env.SUPER_ADMIN_EMAIL,
    }).select("+password");

    if (existingAdmin) {
      existingAdmin.name =
        process.env.SUPER_ADMIN_NAME || existingAdmin.name || "TravelEx Admin";
      existingAdmin.role = "superAdmin";
      existingAdmin.isActive = true;

      // This updates password from .env and your Admin model will hash it automatically
      existingAdmin.password = process.env.SUPER_ADMIN_PASSWORD;

      await existingAdmin.save();

      console.log("Super admin already existed, details updated successfully.");
      console.log(`Email: ${process.env.SUPER_ADMIN_EMAIL}`);
      process.exit(0);
    }

    await Admin.create({
      name: process.env.SUPER_ADMIN_NAME || "TravelEx Admin",
      email: process.env.SUPER_ADMIN_EMAIL,
      password: process.env.SUPER_ADMIN_PASSWORD,
      role: "superAdmin",
      isActive: true,
    });

    console.log("Super admin created successfully.");
    console.log(`Email: ${process.env.SUPER_ADMIN_EMAIL}`);

    process.exit(0);
  } catch (error) {
    console.error("Admin seed failed:", error.message);
    process.exit(1);
  }
};

seedAdmin();