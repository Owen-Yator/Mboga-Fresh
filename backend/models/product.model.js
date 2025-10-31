import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, default: 0 },
    unit: { type: String, trim: true, default: "" }, // ADDED: This will hold "/kg", "per piece", etc.
    status: {
      type: String,
      enum: ["In Stock", "Out of Stock"],
      default: "In Stock",
    },
    imagePath: { type: String, default: "" },
    description: { type: String, default: "" },
    vendorId: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Product", ProductSchema);
