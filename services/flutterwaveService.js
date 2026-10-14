import { ApiError } from "../utils/ApiError.js";

const FLUTTERWAVE_API_URL = "https://api.flutterwave.com/v3";

const getSecretKey = () => {
  const secretKey = process.env.FLW_SECRET_KEY;
  if (!secretKey) {
    throw new ApiError(503, "Flutterwave payments are not configured");
  }
  return secretKey;
};

const readFlutterwaveResponse = async (response) => {
  let result;
  try {
    result = await response.json();
  } catch {
    throw new ApiError(502, "Flutterwave returned an invalid response");
  }

  if (
    !result ||
    typeof result !== "object" ||
    !response.ok ||
    result.status !== "success"
  ) {
    throw new ApiError(
      502,
      result?.message || "Flutterwave request failed"
    );
  }
  return result.data;
};

export const initializePayment = async ({
  reference,
  amount,
  email,
  name,
  phone,
  redirectUrl,
  orderId,
}) => {
  let response;
  try {
    response = await fetch(`${FLUTTERWAVE_API_URL}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getSecretKey()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        tx_ref: reference,
        amount: String(amount),
        currency: "NGN",
        redirect_url: redirectUrl,
        customer: {
          email,
          name,
          phonenumber: phone,
        },
        customizations: {
          title: "Selling Point",
          description: `Payment for order ${orderId}`,
        },
        meta: { order_id: orderId },
      }),
    });
  } catch {
    throw new ApiError(502, "Could not connect to Flutterwave");
  }

  const payment = await readFlutterwaveResponse(response);
  if (typeof payment?.link !== "string" || !payment.link.startsWith("https://")) {
    throw new ApiError(502, "Flutterwave did not return a valid payment link");
  }
  return payment.link;
};

export const verifyPayment = async (transactionId) => {
  if (!/^\d+$/.test(String(transactionId))) {
    throw new ApiError(400, "Invalid Flutterwave transaction ID");
  }

  let response;
  try {
    response = await fetch(
      `${FLUTTERWAVE_API_URL}/transactions/${encodeURIComponent(transactionId)}/verify`,
      {
        headers: {
          Authorization: `Bearer ${getSecretKey()}`,
          Accept: "application/json",
        },
      }
    );
  } catch {
    throw new ApiError(502, "Could not connect to Flutterwave");
  }

  return readFlutterwaveResponse(response);
};
