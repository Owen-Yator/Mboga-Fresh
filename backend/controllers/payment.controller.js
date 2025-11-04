// backend/controllers/payment.controller.js
import Order from "../models/order.model.js";
import BulkOrder from "../models/bulkOrder.model.js";
import Notification from "../models/notification.model.js";
import mongoose from "mongoose";

// --- NOTIFICATION HELPER ---
const createDbNotification = async (
  recipientId,
  orderId,
  message,
  type = "order",
  title = "Order Alert"
) => {
  const newNotification = new Notification({
    recipient: recipientId,
    type: type,
    title: title,
    message: message,
    relatedId: orderId,
  });
  await newNotification.save();
};
// -----------------------------------------------------------------

export const handleMpesaCallback = async (req, res) => {
  const callbackData = req.body;
  const {
    Body: { stkCallback },
  } = callbackData;

  console.log("--- RECEIVED MPESA CALLBACK ---");
  console.log(JSON.stringify(stkCallback, null, 2)); // This log is already here and is good

  const checkoutRequestId = stkCallback?.CheckoutRequestID;
  const resultCode = stkCallback?.ResultCode;
  const resultDesc = stkCallback?.ResultDesc;

  // We must acknowledge the request immediately
  res.status(200).json({ message: "Callback received." });

  try {
    let order = null;
    let bulkOrder = null;
    let orderType = null;

    if (!checkoutRequestId) {
      console.warn(
        "Mpesa Callback: Invalid callback, missing CheckoutRequestID."
      );
      return;
    }

    order = await Order.findOne({
      mpesaCheckoutRequestId: checkoutRequestId,
    });

    if (order) {
      orderType = "B2C";
    } else {
      bulkOrder = await BulkOrder.findOne({
        "paymentDetails.checkoutRequestId": checkoutRequestId,
      });
      if (bulkOrder) {
        orderType = "B2B";
      }
    }

    if (!orderType) {
      console.warn(
        "Mpesa Callback: Order not found for CheckoutRequestID:",
        checkoutRequestId
      );
      return;
    }

    // --- 2. ADD THIS LOG ---
    console.log(
      `Callback identified as: ${orderType} for Order ID: ${
        order?._id || bulkOrder?._id
      }`
    );
    // --- END OF LOG ---

    const getCallbackValue = (name) =>
      stkCallback.CallbackMetadata?.Item?.find((item) => item.Name === name)
        ?.Value;

    if (resultCode === 0) {
      // --- PAYMENT SUCCESSFUL ---
      const paymentUpdate = {
        paymentStatus: "Paid",
        orderStatus: "New Order",
        mpesaReceiptNumber: getCallbackValue("MpesaReceiptNumber"),
        mpesaTransactionDate: getCallbackValue("TransactionDate"),
        mpesaPhoneNumber: getCallbackValue("PhoneNumber"),
      };

      const bulkPaymentUpdate = {
        paymentStatus: "Escrow",
        orderStatus: "Pending",
        "paymentDetails.mpesaReceiptNumber":
          getCallbackValue("MpesaReceiptNumber"),
        "paymentDetails.mpesaTransactionDate":
          getCallbackValue("TransactionDate"),
        "paymentDetails.mpesaPhoneNumber": getCallbackValue("PhoneNumber"),
      };

      if (orderType === "B2C") {
        await Order.findByIdAndUpdate(
          order._id,
          { $set: paymentUpdate },
          { new: true }
        );

        if (order.items && order.items.length > 0 && order.items[0].vendor) {
          const notificationMessage = `Payment confirmed! New Order #${order._id
            .toString()
            .substring(18)
            .toUpperCase()} is ready.`;
          await createDbNotification(
            order.items[0].vendor,
            order._id,
            notificationMessage,
            "order",
            "Payment Confirmed"
          );
        }
      } else if (orderType === "B2B") {
        await BulkOrder.findByIdAndUpdate(
          bulkOrder._id,
          { $set: bulkPaymentUpdate },
          { new: true }
        );

        const notificationMessage = `Payment confirmed! New Bulk Order #${bulkOrder._id
          .toString()
          .substring(18)
          .toUpperCase()} is ready for your acceptance.`;
        await createDbNotification(
          bulkOrder.farmerId,
          bulkOrder._id,
          notificationMessage,
          "order",
          "New Bulk Order"
        );
      }
    } else {
      // --- PAYMENT FAILED ---
      const failureUpdate = {
        paymentStatus: "Failed",
        paymentFailureReason: resultDesc,
      };
      const bulkFailureUpdate = {
        paymentStatus: "Failed",
        "paymentDetails.paymentFailureReason": resultDesc,
      };

      if (orderType === "B2C") {
        await Order.findByIdAndUpdate(
          order._id,
          { $set: failureUpdate },
          { new: true }
        );
      } else if (orderType === "B2B") {
        await BulkOrder.findByIdAndUpdate(
          bulkOrder._id,
          { $set: bulkFailureUpdate },
          { new: true }
        );
      }
    }
  } catch (error) {
    console.error("Mpesa Callback Processing Error:", error);
  }
};
