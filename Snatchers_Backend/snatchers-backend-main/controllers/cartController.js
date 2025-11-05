import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import mongoose from "mongoose";

// Helper: resolve a stable Mongo ObjectId for the current user.
// Prefers req.user._id (from DB), falls back to session userInfo._id.
// If only a uid/email is present, this will try to find an existing User by
// those attributes is handled by upstream auth middleware. Here we only
// accept ObjectId-like values to satisfy the Cart schema.
function resolveUserObjectId(req) {
  const candidates = [
    req.user?._id,
    req.user?.id, // ✅ add this line
    req.session?.userInfo?._id,
  ].filter(Boolean);

  for (const c of candidates) {
    if (c && typeof c === "object" && c._bsontype === "ObjectID") return c;
    if (typeof c === "string" && mongoose.Types.ObjectId.isValid(c)) {
      return new mongoose.Types.ObjectId(c);
    }
  }
  return null;
}

// @desc    Add item to cart
// @route   POST /api/cart/:productId
// @access  Private
export const addToCart = async (req, res) => {
  console.log({ req: req.params, res: req.body });

  try {
    const { productId } = req.params;
    let selectedVariant = req?.body?.selectedVariant ?? null;
    let quantity = 1;

    // ✅ Ensure valid user
    const userObjectId = resolveUserObjectId(req);
    if (!userObjectId)
      return res.status(401).json({ error: "Not authenticated" });

    // ✅ Validate product ID
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    // ✅ Fetch product
    const product = await Product.findById(productId).exec();
    if (!product) return res.status(404).json({ error: "Product not found" });
    console.log({ product });

    // ✅ Defensive inventory handling
    const trackInventory =
      product?.inventory?.trackInventory === true ? true : false;
    const availableQuantity =
      typeof product?.inventory?.quantity === "number"
        ? product.inventory.quantity
        : Infinity;

    // Debug logs
    console.log("Track inventory:", trackInventory);
    console.log("Available quantity:", availableQuantity);

    // if (trackInventory && availableQuantity < quantity) {
    //   return res.status(400).json({
    //     error: "Insufficient inventory",
    //     availableQuantity,
    //     requestedQuantity: quantity,
    //   });
    // }

    // ✅ Active status check
    if (product.status !== "active") {
      return res
        .status(400)
        .json({ error: "Product is not available for purchase" });
    }

    const price = product.offerPrice || product.price || 0;

    let cart = await Cart.findOne({ user: userObjectId }).exec();

    if (!cart) {
      // Create new cart
      cart = new Cart({
        user: userObjectId,
        items: [
          {
            product: productId,
            quantity,
            price,
            selectedVariant: selectedVariant || null,
          },
        ],
        totalPrice: price * quantity,
      });
    } else {
      // Update existing cart
      const existing = cart.items.find(
        (it) =>
          String(it.product) === String(productId) &&
          JSON.stringify(it.selectedVariant) === JSON.stringify(selectedVariant)
      );

      if (existing) {
        const newQuantity = existing.quantity + quantity;

        if (trackInventory && availableQuantity < newQuantity) {
          return res.status(400).json({
            error: "Insufficient inventory for total quantity",
            availableQuantity,
            currentInCart: existing.quantity,
            requestedQuantity: quantity,
          });
        }

        existing.quantity = newQuantity;
      } else {
        cart.items.push({
          product: productId,
          quantity,
          price,
          selectedVariant: selectedVariant || null,
        });
      }

      cart.totalPrice = cart.items.reduce(
        (acc, it) => acc + it.price * it.quantity,
        0
      );
    }

    await cart.save();
    const populated = await cart.populate("items.product");

    return res.status(201).json(populated);
  } catch (err) {
    console.error("CART_ADD_ERROR:", err.message, err.stack);
    return res.status(500).json({ error: "Failed to update cart" });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:productId
// @access  Private
export const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const userObjectId = resolveUserObjectId(req);
    if (!userObjectId)
      return res.status(401).json({ error: "Not authenticated" });

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    let cart = await Cart.findOne({ user: userObjectId });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const idx = cart.items.findIndex(
      (it) => String(it.product) === String(productId)
    );
    if (idx > -1) {
      cart.items.splice(idx, 1);
      cart.totalPrice = cart.items.reduce(
        (acc, it) => acc + it.price * it.quantity,
        0
      );
      await cart.save();
      return res.status(200).json({ message: "Item removed from cart" });
    }
    return res.status(404).json({ error: "Item not in cart" });
  } catch (err) {
    console.error("CART_DELETE_ERROR:", err);
    return res.status(500).json({ error: "Failed to update cart" });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/:productId
// @access  Private
export const updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, selectedVariant } = req.body;

    const userObjectId = resolveUserObjectId(req);
    if (!userObjectId)
      return res.status(401).json({ error: "Not authenticated" });

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: "Quantity must be at least 1" });
    }

    const product = await Product.findById(productId).exec();
    if (!product) return res.status(404).json({ error: "Product not found" });

    // Real-time inventory validation
    if (product.inventory && product.inventory.trackInventory) {
      const availableQuantity = product.inventory.quantity || 0;
      if (availableQuantity < quantity) {
        return res.status(400).json({
          error: "Insufficient inventory",
          availableQuantity,
          requestedQuantity: quantity,
        });
      }
    }

    let cart = await Cart.findOne({ user: userObjectId });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const itemIndex = cart.items.findIndex(
      (it) =>
        String(it.product) === String(productId) &&
        JSON.stringify(it.selectedVariant) === JSON.stringify(selectedVariant)
    );

    if (itemIndex === -1) {
      return res.status(404).json({ error: "Item not in cart" });
    }

    cart.items[itemIndex].quantity = quantity;
    cart.totalPrice = cart.items.reduce(
      (acc, it) => acc + it.price * it.quantity,
      0
    );

    await cart.save();
    const populated = await cart.populate("items.product");
    return res.status(200).json(populated);
  } catch (err) {
    console.error("CART_UPDATE_ERROR:", err);
    return res.status(500).json({ error: "Failed to update cart item" });
  }
};

// @desc    Validate cart inventory
// @route   POST /api/cart/validate
// @access  Private
export const validateCartInventory = async (req, res) => {
  try {
    const userObjectId = resolveUserObjectId(req);
    if (!userObjectId)
      return res.status(401).json({ error: "Not authenticated" });

    const cart = await Cart.findOne({ user: userObjectId }).populate(
      "items.product"
    );
    if (!cart) return res.json({ valid: true, items: [] });

    const validationResults = [];
    let hasIssues = false;

    for (const item of cart.items) {
      const product = item.product;
      const result = {
        productId: product._id,
        title: product.title,
        requestedQuantity: item.quantity,
        valid: true,
        issues: [],
      };

      // Check if product is still active
      if (product.status !== "active") {
        result.valid = false;
        result.issues.push("Product is no longer available");
        hasIssues = true;
      }

      // Check inventory
      if (product.inventory && product.inventory.trackInventory) {
        const availableQuantity = product.inventory.quantity || 0;
        if (availableQuantity < item.quantity) {
          result.valid = false;
          result.availableQuantity = availableQuantity;
          result.issues.push(`Only ${availableQuantity} items available`);
          hasIssues = true;
        }
      }

      validationResults.push(result);
    }

    return res.json({
      valid: !hasIssues,
      items: validationResults,
      totalItems: cart.items.length,
    });
  } catch (err) {
    console.error("CART_VALIDATE_ERROR:", err);
    return res.status(500).json({ error: "Failed to validate cart" });
  }
};

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
export const getCart = async (req, res) => {
  try {
    const userObjectId = resolveUserObjectId(req);
    if (!userObjectId)
      return res.status(401).json({ error: "Not authenticated" });

    const cart = await Cart.findOne({ user: userObjectId }).populate(
      "items.product"
    );
    if (!cart) return res.json([]);

    // Include cart metadata
    return res.json({
      items: cart.items,
      totalPrice: cart.totalPrice,
      totalItems: cart.items.reduce((acc, item) => acc + item.quantity, 0),
      updatedAt: cart.updatedAt,
    });
  } catch (err) {
    console.error("CART_GET_ERROR:", err);
    return res.status(500).json({ error: "Failed to get cart" });
  }
};
