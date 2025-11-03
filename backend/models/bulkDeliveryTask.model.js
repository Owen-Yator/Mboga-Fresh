import mongoose from "mongoose";

const BulkDeliveryTaskSchema = new mongoose.Schema(
  {
    // B2B order (Vendor -> Farmer)
    bulkOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BulkOrder",
      required: true,
      unique: true, // One task per bulk order
    },

    // The SELLER (the Farmer)
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // The DRIVER (Truck, etc. - can still be a "rider" role for now)
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    status: {
      type: String,
      enum: [
        "Awaiting Acceptance", // Waiting for a driver
        "Accepted/Awaiting Pickup",
        "In Transit",
        "Delivered",
        "Cancelled",
      ],
      default: "Awaiting Acceptance",
    },
    pickupCode: {
      type: String,
      required: true,
    },
    // The VENDOR (Buyer) confirmation code
    vendorConfirmationCode: {
      type: String,
      required: true,
    },
    deliveryAddress: {
      type: Object,
      required: true,
    },
    deliveryFee: {
      type: Number,
      default: 500, // Maybe bulk orders have a higher fee
    },
  },
  {
    timestamps: true,
  }
);

BulkDeliveryTaskSchema.index({ driver: 1, status: 1 });
BulkDeliveryTaskSchema.index({ seller: 1, status: 1 });

const BulkDeliveryTask = mongoose.model(
  "BulkDeliveryTask",
  BulkDeliveryTaskSchema
);
export default BulkDeliveryTask;
