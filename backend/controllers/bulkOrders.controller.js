import BulkOrder from "../models/bulkOrder.model.js";
import BulkProduct from "../models/bulkProduct.model.js";
import FarmerProfile from "../models/farmerProfile.model.js";

// @desc    Place a new bulk order
// @route   POST /api/bulk-orders/place
// @access  Private (Vendor)
export const placeBulkOrder = async (req, res) => {
  try {
    const vendorUserId = req.user._id;
    const { items, shippingAddress, mpesaPhone } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items in cart" });
    }

    // In a real app, you'd get the farmerId from the items,
    // For now, we assume one farmer per order for simplicity.
    // Let's find the first product to get the farmer.
    const firstProduct = await BulkProduct.findById(items[0].product).lean();
    if (!firstProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    const farmerId = firstProduct.ownerId;

    // TODO: Add M-PESA STK Push logic here
    // For now, we just create the order

    const newOrder = new BulkOrder({
      vendorId: vendorUserId,
      farmerId: farmerId,
      items: items, // Assuming items are pre-validated
      totalAmount: req.body.totalAmount, // You should calculate this on the backend
      shippingAddress,
      paymentStatus: "Escrow", // Assume payment is initiated
      orderStatus: "Pending",
      paymentDetails: {
        mpesaPhone,
      },
    });

    const savedOrder = await newOrder.save();

    res.status(201).json({
      message: "Order placed successfully",
      orderId: savedOrder._id,
    });
  } catch (err) {
    console.error("Place Bulk Order Error:", err);
    res.status(500).json({ message: "Server error placing order" });
  }
};

// @desc    Get all bulk orders placed BY the logged-in vendor
// @route   GET /api/bulk-orders/my-orders
// @access  Private (Vendor)
export const getMyBulkOrders = async (req, res) => {
  try {
    const vendorUserId = req.user._id;

    const orders = await BulkOrder.find({ vendorId: vendorUserId })
      .populate({
        path: "items.product",
        select: "name",
      })
      .populate({
        path: "farmerId",
        select: "name avatar", // Get the farmer's User details
      })
      .sort({ createdAt: -1 })
      .lean();

    // Get FarmerProfile data to show 'farmName'
    const farmerIds = orders.map((o) => o.farmerId?._id).filter(Boolean);
    const profiles = await FarmerProfile.find({ user: { $in: farmerIds } })
      .select("user farmName")
      .lean();
    const profileMap = new Map(
      profiles.map((p) => [String(p.user), p.farmName])
    );

    const enrichedOrders = orders.map((order) => ({
      ...order,
      farmerInfo: {
        ...order.farmerId,
        farmName: profileMap.get(String(order.farmerId?._id)),
      },
    }));

    res.json(enrichedOrders);
  } catch (err) {
    console.error("Error fetching vendor's bulk orders:", err);
    res.status(500).json({ message: "Failed to fetch bulk orders" });
  }
};

// @desc    Get all bulk orders to be FULFILLED by the logged-in farmer
// @route   GET /api/bulk-orders/farmer-orders
// @access  Private (Farmer)
export const getFarmerBulkOrders = async (req, res) => {
  try {
    const farmerUserId = req.user._id;
    const orders = await BulkOrder.find({ farmerId: farmerUserId })
      .populate("vendorId", "name phone") // Get the vendor's (buyer's) info
      .populate("items.product", "name")
      .sort({ createdAt: -1 })
      .lean();
    res.json(orders);
  } catch (err) {
    console.error("Error fetching farmer's bulk orders:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};
