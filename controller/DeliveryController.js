import {
  getCheckoutOptions as createCheckoutOptions,
  NIGERIAN_STATES,
} from "../config/deliveryOptions.js";
import DeliverySettings from "../models/DeliverySettings.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getSavedFees = async () => {
  const settings = await DeliverySettings.findOne({ key: "delivery" }).lean();
  return Object.fromEntries(
    (settings?.fees || []).map(({ state, fee }) => [state, fee])
  );
};

export const getCheckoutOptions = asyncHandler(async (_req, res) => {
  const savedFees = await getSavedFees();

  return res.status(200).json({
    success: true,
    data: createCheckoutOptions(savedFees),
  });
});

export const updateDeliveryFee = asyncHandler(async (req, res) => {
  const state = NIGERIAN_STATES.find(
    (name) => name.toLowerCase() === String(req.params.state).trim().toLowerCase()
  );
  if (!state) throw new ApiError(400, "Select a valid Nigerian state");

  const fee = req.body?.fee;
  if (typeof fee !== "number" || !Number.isFinite(fee) || fee < 0) {
    throw new ApiError(400, "Delivery fee must be a non-negative number");
  }

  let settings = await DeliverySettings.findOne({ key: "delivery" });
  if (!settings) settings = new DeliverySettings({ key: "delivery", fees: [] });

  const existingFee = settings.fees.find(
    (entry) => entry.state.toLowerCase() === state.toLowerCase()
  );
  if (existingFee) {
    existingFee.fee = fee;
  } else {
    settings.fees.push({ state, fee });
  }
  await settings.save();

  return res.status(200).json({
    success: true,
    message: `Delivery fee for ${state} saved`,
    data: { state, fee },
  });
});
