import NaijaStates from "naija-state-local-government";

export const NIGERIAN_STATES = NaijaStates.states();
export const PICKUP_ADDRESS =
  "Shop No. 8, Baptist High Junction, Ogbomoso, Oyo State";

const parseDeliveryFees = () => {
  try {
    const fees = JSON.parse(process.env.DELIVERY_FEES_BY_STATE || "{}");
    if (!fees || Array.isArray(fees) || typeof fees !== "object") {
      throw new Error("DELIVERY_FEES_BY_STATE must be a JSON object");
    }
    return fees;
  } catch (error) {
    throw new Error(
      `Invalid DELIVERY_FEES_BY_STATE configuration: ${error.message}`
    );
  }
};

export const getDeliveryFees = (savedFees = {}) => {
  const configuredFees = parseDeliveryFees();
  const normalizedFees = {};

  for (const [state, fee] of Object.entries(configuredFees)) {
    const canonicalState = NIGERIAN_STATES.find(
      (name) => name.toLowerCase() === state.toLowerCase()
    );
    if (!canonicalState) {
      throw new Error(`Unknown state in DELIVERY_FEES_BY_STATE: ${state}`);
    }
    if (typeof fee !== "number" || !Number.isFinite(fee) || fee < 0) {
      throw new Error(
        `Delivery fee for ${canonicalState} must be a non-negative number`
      );
    }
    normalizedFees[canonicalState] = fee;
  }

  for (const [state, fee] of Object.entries(savedFees)) {
    const canonicalState = NIGERIAN_STATES.find(
      (name) => name.toLowerCase() === state.toLowerCase()
    );
    if (!canonicalState) {
      throw new Error(`Unknown state in saved delivery fees: ${state}`);
    }
    if (typeof fee !== "number" || !Number.isFinite(fee) || fee < 0) {
      throw new Error(
        `Delivery fee for ${canonicalState} must be a non-negative number`
      );
    }
    normalizedFees[canonicalState] = fee;
  }

  return Object.fromEntries(
    NIGERIAN_STATES.map((state) => [state, normalizedFees[state] ?? null])
  );
};

export const getDeliveryFee = (state, savedFees = {}) => {
  const canonicalState = NIGERIAN_STATES.find(
    (name) => name.toLowerCase() === String(state || "").trim().toLowerCase()
  );
  if (!canonicalState) {
    const error = new Error("Please select a valid Nigerian state");
    error.statusCode = 400;
    throw error;
  }

  const fee = getDeliveryFees(savedFees)[canonicalState];
  if (fee === null) {
    const error = new Error(
      `Delivery fee for ${canonicalState} has not been configured`
    );
    error.statusCode = 503;
    throw error;
  }

  return { state: canonicalState, fee };
};

export const getCheckoutOptions = (savedFees = {}) => ({
  states: NIGERIAN_STATES,
  deliveryFees: getDeliveryFees(savedFees),
  pickupAddress: PICKUP_ADDRESS,
});
