import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BulkProduct",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  name: { type: String, required: true },
  price: { type: Number, required: true }, // Price at time of order
});

const bulkOrderSchema = new mongoose.Schema(
  {
    // The VENDOR who is BUYING
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // The FARMER who is SELLING
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
    },
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    orderStatus: {
      type: String,
      enum: ["Pending", "Confirmed", "In Transit", "Delivered", "Cancelled"],
      default: "Pending",
    },
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Paid", "Failed", "Escrow"],
      default: "Unpaid",
    },
    paymentDetails: {
      mpesaPhone: { type: String },
      checkoutRequestId: { type: String },
      paymentFailureReason: { type: String },
    },
  },
  { timestamps: true }
);

bulkOrderSchema.index({ vendorId: 1, createdAt: -1 });
bulkOrderSchema.index({ farmerId: 1, createdAt: -1 });

export default mongoose.model("BulkOrder", bulkOrderSchema);
