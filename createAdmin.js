import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import connectDB from "./config/dbConnect.js";
import User, { USER_ROLES } from "./models/User.js";

const {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_FIRST_NAME = "Admin",
  ADMIN_LAST_NAME = "User",
} = process.env;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  process.exit(1);
}
await connectDB();

const email = ADMIN_EMAIL.toLowerCase().trim();
const existing = await User.findOne({ email });

if (existing) {
  await User.updateOne({ _id: existing._id }, { role: USER_ROLES.ADMIN });
  console.log(`Existing user ${email} promoted to admin`);
} else {
  await User.create({
    firstName: ADMIN_FIRST_NAME,
    lastName: ADMIN_LAST_NAME,
    email,
    password: await bcrypt.hash(ADMIN_PASSWORD, 10),
    role: USER_ROLES.ADMIN,
  });
  console.log(`Admin user ${email} created`);
}

await mongoose.disconnect();