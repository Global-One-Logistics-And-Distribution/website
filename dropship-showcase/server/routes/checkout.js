const crypto = require("crypto");
const express = require("express");
const Razorpay = require("razorpay");
const { body, validationResult } = require("express-validator");
const requireAuth = require("../middleware/auth");

const router = express.Router();

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

router.post(
  "/create-order",
  requireAuth,
  [
    body("amount").isInt({ min: 100 }).withMessage("Amount must be at least 100 paise."),
    body("currency").optional().isString().isLength({ min: 3, max: 3 }),
    body("receipt").optional().isString().isLength({ min: 3, max: 40 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return res.status(500).json({ error: "Razorpay is not configured on server." });
    }

    const amount = Number(req.body.amount);
    const currency = (req.body.currency || "INR").toUpperCase();
    const receipt = req.body.receipt || `receipt_${Date.now()}`;

    try {
      const order = await razorpay.orders.create({
        amount,
        currency,
        receipt,
      });

      return res.status(200).json({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
      });
    } catch (error) {
      const statusCode = Number(error?.statusCode) || 500;
      if (statusCode === 401) {
        return res.status(401).json({ error: "Razorpay authentication failed." });
      }
      return res.status(500).json({
        error: "Failed to create Razorpay order.",
        details:
          process.env.NODE_ENV === "production" ? undefined : error?.error?.description || error?.message,
      });
    }
  }
);

router.post(
  "/verify-payment",
  requireAuth,
  [
    body("razorpay_order_id").isString().notEmpty(),
    body("razorpay_payment_id").isString().notEmpty(),
    body("razorpay_signature").isString().notEmpty(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({ error: "Razorpay secret is not configured on server." });
    }

    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;

    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto.createHmac("sha256", keySecret).update(payload).digest("hex");

    const received = Buffer.from(String(signature));
    const expected = Buffer.from(String(expectedSignature));
    const isMatch = received.length === expected.length && crypto.timingSafeEqual(received, expected);

    if (!isMatch) {
      return res.status(400).json({ success: false, error: "Invalid payment signature." });
    }

    return res.status(200).json({ success: true, message: "Payment signature verified." });
  }
);

router.post("/webhook", express.raw({ type: "application/json" }), (_req, res) => {
  res.status(503).json({ error: "Webhook endpoint not yet configured." });
});

module.exports = router;
