import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "TravelEx API is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

export default router;