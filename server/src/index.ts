import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import orderRouter from "./routes/order.routes.js";
import paymentRouter from "./routes/payment.routes.js";
import authRouter from "./routes/auth.routes.js";
import catalogRouter from "./routes/catalog.routes.js";
import adminRouter from "./routes/admin.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
const frontendUrls = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((u) => u.trim());
app.use(
  cors({
    origin: [...frontendUrls, "https://accept.paymob.com"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded product images from local disk.
const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
app.use("/uploads", express.static(path.resolve(UPLOAD_DIR)));

// Health Check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Register Routes
app.use("/api/auth", authRouter);
app.use("/api", catalogRouter); // public storefront reads (products, categories, coupons, settings)
app.use("/api/orders", orderRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/admin", adminRouter); // guarded admin CRUD + uploads

// Serve React frontend (built output lives at project root /dist)
const distPath = path.resolve(__dirname, "../../dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Start Server
app.listen(PORT, () => {
  console.log(`[Jamhawi Server] Running in ${process.env.NODE_ENV || "development"} mode.`);
  console.log(`[Jamhawi Server] Listening at http://localhost:${PORT}`);
});
