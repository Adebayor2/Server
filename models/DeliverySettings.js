import mongoose from "mongoose";

const deliveryFeeSchema = new mongoose.Schema(
  {
    state: { type: String, required: true, trim: true },
    fee: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const deliverySettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "delivery" },
    fees: { type: [deliveryFeeSchema], default: [] },
  },
  { timestamps: true }
);

deliverySettingsSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("DeliverySettings", deliverySettingsSchema);
