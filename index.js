import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/dbConnect.js";
import apiHealth from "./routes/apiHealth.js";
import { notFound } from "./middleWares/notFound.js";
import { errorHandler } from "./middleWares/errorHandler.js";
import AuthRoutes from "./routes/AuthRoutes.js";
import ProductsRoutes from "./routes/ProductsRoutes.js";
import CategoryRoutes from "./routes/CategoryRoutes.js";
import CartRoutes from "./routes/CartRoutes.js";
import FavoriteRoutes from "./routes/FavoriteRoutes.js";
import OrderRoutes from "./routes/OrderRoutes.js";
import DeliveryRoutes from "./routes/DeliveryRoutes.js";

dotenv.config();
const app = express();
const configuredClientOrigins = (process.env.CLIENT_URI || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const clientOrigins = new Set([
  ...configuredClientOrigins,
  ...(process.env.NODE_ENV === "production"
    ? []
    : ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"]),
]);
const port = Number(process.env.PORT) || 5000;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || clientOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/health", apiHealth);
app.use("/api/auth", AuthRoutes);
app.use("/api/products", ProductsRoutes);
app.use("/api/categories", CategoryRoutes);
app.use("/api/cart", CartRoutes);
app.use("/api/favorites", FavoriteRoutes);
app.use("/api/orders", OrderRoutes);
app.use("/api/delivery", DeliveryRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((err) => {
    console.log(`Error in MongoDB connection: ${err}`);
    process.exit(1);
  });
