import cors from "cors";

const parseOrigins = (value = "") => {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const securityMiddleware = (app) => {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    ...parseOrigins(process.env.CORS_ORIGINS),
    "https://travelexpk.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
  ].filter(Boolean);

  const corsOptions = {
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("Blocked by CORS:", origin);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
  };

  app.use(cors(corsOptions));
};