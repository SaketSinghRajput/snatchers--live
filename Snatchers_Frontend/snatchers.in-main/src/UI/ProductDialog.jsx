import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import {
  addGuestCartItem,
  removeGuestCartItem,
  guestCartIncludes,
} from "../utils/guestCart";
import { trackProductView, trackCartAdd } from "../utils/behaviorTracking";
import { motion } from "framer-motion";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { toast } from "react-toastify";
import products from "../Data/ProductData";
import ProductCard from "./ProductCard";
import ProductGallery from "../components/ProductGallery";
import ProductVariants from "../components/ProductVariants";
import useProductVariants from "../hooks/useProductVariants";
import ReviewSystem from "../components/ReviewSystem/ReviewSystem";
import RecommendationCarousel from "../components/RecommendationCarousel";
import { useAuth } from "../contexts/AuthContext";

const renderStars = (rating) => {
  const maxStars = 5;
  const filledStars = Math.round(rating);
  const stars = [];
  for (let i = 1; i <= maxStars; i++) {
    stars.push(
      <i
        key={i}
        className={`fa fa-star text-yellow-400 text-lg ${
          i <= filledStars ? "opacity-100" : "opacity-30"
        } transition-opacity duration-400 ease-in-out`}
      ></i>
    );
  }
  return stars;
};

const ProductDialog = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [similarProducts, setSimilarProducts] = useState([]);

  // Use product variants hook
  const {
    variants,
    selectedVariants,
    isValidSelection,
    stockStatus,
    calculatedPrice,
    updateVariant,
    hasVariants,
    isOutOfStock,
  } = useProductVariants(product);

  // We use server session cookie + api (withCredentials) to detect auth; no Cognito getSession here

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let isAuthenticated = false;
      const token = localStorage.getItem("token");
      if (token) {
        setToken(token);
        isAuthenticated(true);
      }

      try {
        // 1. Fetch product data (no auth required)
        try {
          const productUrl = `/api/products/${productId}`;
          const productRes = await api.get(productUrl);
          setProduct(productRes.data);

          // Track product view
          if (productRes.data) {
            trackProductView(productRes.data._id, user?.uid);
          }
        } catch (apiErr) {
          console.error("API call failed, trying local data:", apiErr);
          // Local fallback (kept from original logic)
          let localProduct =
            products.find((p) => p.id?.toString() === productId) ||
            products.find((p) => p._id === productId);
          if (localProduct) {
            const convertedProduct = {
              _id: localProduct._id || localProduct.id?.toString?.(),
              title: localProduct.title,
              price: localProduct.price,
              offerPrice: localProduct.offerPrice || null,
              rating: localProduct.rating,
              description: localProduct.description,
              images: localProduct.images,
              badgeText: localProduct.badgeText,
              badgeClass: localProduct.badgeClass,
              category: localProduct.category,
              occasion: localProduct.occasion,
            };
            setProduct(convertedProduct);

            // Track product view for local product
            if (convertedProduct._id) {
              trackProductView(convertedProduct._id, user?.uid);
            }
          } else {
            console.error("Product not found in local data either.");
            throw new Error("Product not found");
          }
        }

        // 2. Try to fetch user data (cart & wishlist) using session cookie
        try {
          const [cartRes, wishlistRes] = await Promise.all([
            api.get("/api/cart"),
            api.get("/api/wishlist"),
          ]);

          // isAuthenticated = true;

          const cartIds = Array.isArray(cartRes.data)
            ? cartRes.data.map((item) => item.product._id)
            : [];
          const wishlistIds = Array.isArray(wishlistRes.data)
            ? wishlistRes.data.map((item) =>
                typeof item === "object" && item.productId
                  ? item.productId._id || item.productId
                  : item._id || item
              )
            : [];

          setCart(cartIds);
          setWishlist(wishlistIds);
        } catch (err) {
          // If fetching user data fails (likely unauthenticated), treat as guest
          console.log(
            "Could not fetch user data. Assuming guest.",
            err?.response?.status || err.message
          );
          // isAuthenticated = false;
          setWishlist([]);
          try {
            const guest = (await import("../utils/guestCart")).getGuestCart();
            setCart(guest.map((p) => p._id));
          } catch (e) {
            setCart([]);
          }
        }
      } catch (err) {
        console.error("Error fetching product data:", err);
        setProduct(null);
      } finally {
        // 3. Store boolean auth flag in token state so UI can enable/disable actions
        setToken(!!isAuthenticated);
        setLoading(false);
      }
    };

    fetchData();
    // Remove getSession from deps; we only care about productId changes
  }, [productId]);

  // After product is loaded, fetch other products and filter by same category
  useEffect(() => {
    if (!product) return;
    let mounted = true;
    const loadSimilar = async () => {
      const sameCategory = (a, b) => {
        if (!a || !b) return false;
        const norm = (v) =>
          Array.isArray(v)
            ? v.map(String).map((s) => s.toLowerCase())
            : String(v).toLowerCase();
        const na = norm(a);
        const nb = norm(b);
        if (Array.isArray(na)) return na.includes(nb);
        if (Array.isArray(nb)) return nb.includes(na);
        return na === nb;
      };
      try {
        const res = await api.get("/api/products");
        if (!mounted) return;
        const all = Array.isArray(res.data) ? res.data : [];
        const similar = all
          .filter(
            (p) =>
              String(p._id) !== String(product._id) &&
              sameCategory(p.category, product.category)
          )
          .slice(0, 6)
          .map((p) => ({
            _id: p._id,
            title: p.title,
            price: p.price,
            offerPrice: p.offerPrice ?? null,
            rating: p.rating,
            images: p.images || [],
            badgeText: p.badgeText,
            badgeClass: p.badgeClass,
          }));
        setSimilarProducts(similar);
      } catch (err) {
        console.warn(
          "Failed to fetch products for similar list, using local fallback",
          err?.message || err
        );
        const fallback = products
          .filter(
            (p) =>
              String(p.id || p._id) !== String(product._id) &&
              sameCategory(p.category, product.category)
          )
          .slice(0, 6)
          .map((p) => ({
            _id: p._id || p.id?.toString?.() || `${p.title}-${Math.random()}`,
            title: p.title,
            price: p.price,
            offerPrice: p.offerPrice || null,
            rating: p.rating,
            images: p.images || [],
            badgeText: p.badgeText,
            badgeClass: p.badgeClass,
          }));
        if (mounted) setSimilarProducts(fallback);
      }
    };
    loadSimilar();
    return () => (mounted = false);
  }, [product]);

  const isInCart = product ? cart.includes(product._id) : false;
  const isWishlisted = product ? wishlist.includes(product._id) : false;

  const toggleWishlist = async () => {
    if (!product) return;
    // Wishlist requires authentication
    if (!token) {
      // redirect to login/register flow
      navigate("/login");
      return;
    }

    try {
      if (isWishlisted) {
        await api.delete(`/api/wishlist/${product._id}`);
        setWishlist((prev) => prev.filter((id) => id !== product._id));
        window.dispatchEvent(new Event("wishlist:changed"));
        toast.success("Removed from wishlist");
      } else {
        await api.post(`/api/wishlist/add`, { productId: product._id });
        setWishlist((prev) => [...prev, product._id]);
        window.dispatchEvent(new Event("wishlist:changed"));
        toast.success("Added to wishlist");
      }
    } catch (err) {
      console.error("Error updating wishlist:", err);
      toast.error("Unable to update wishlist.");
    }
  };

  const toggleCart = async () => {
    console.log({ product });

    if (!product) return;

    // If logged in, call server API
    if (token) {
      const url = `/api/cart/${product._id}`;
      try {
        if (isInCart) {
          await api.delete(url);
          setCart((prev) => prev.filter((id) => id !== product._id));
        } else {
          await api.post(url);
          setCart((prev) => [...prev, product._id]);

          // Track cart addition
          trackCartAdd(product._id, user?.uid, 1);
        }
      } catch (err) {
        console.error("Error updating cart:", err);
        alert(
          "Unable to update cart. Please try again later or contact support."
        );
      }
      return;
    }

    // Guest flow: use localStorage-backed guest cart
    try {
      if (guestCartIncludes(product._id)) {
        removeGuestCartItem(product._id);
        setCart((prev) => prev.filter((id) => id !== product._id));
      } else {
        addGuestCartItem(product);
        setCart((prev) => Array.from(new Set([...prev, product._id])));

        // Track cart addition for guest users
        trackCartAdd(product._id, null, 1);
      }
    } catch (err) {
      console.error("Guest cart update failed", err);
    }
  };

  // Helpers for similar products list
  const addToCartById = async (prod) => {
    // If logged in, use server API; otherwise use guest cart
    if (token) {
      try {
        await api.post(`/api/cart/${prod._id}`);
        setCart((prev) => Array.from(new Set([...prev, prod._id])));

        // Track cart addition
        trackCartAdd(prod._id, user?.uid, 1);
      } catch (err) {
        console.error("Error adding to cart:", err);
        alert("Unable to add to cart. Please try again later.");
      }
      return;
    }

    try {
      addGuestCartItem(prod);
      setCart((prev) => Array.from(new Set([...prev, prod._id])));

      // Track cart addition for guest users
      trackCartAdd(prod._id, null, 1);
    } catch (err) {
      console.error("Guest add to cart failed:", err);
      alert("Unable to add to cart. Please try again later.");
    }
  };

  const removeFromCartById = async (prodId) => {
    if (token) {
      try {
        await api.delete(`/api/cart/${prodId}`);
        setCart((prev) => prev.filter((id) => id !== prodId));
      } catch (err) {
        console.error("Error removing from cart:", err);
        alert("Unable to remove from cart.");
      }
      return;
    }

    try {
      removeGuestCartItem(prodId);
      setCart((prev) => prev.filter((id) => id !== prodId));
    } catch (err) {
      console.error("Guest remove from cart failed:", err);
      alert("Unable to remove from cart.");
    }
  };

  const toggleWishlistById = async (prod) => {
    if (!token) {
      alert("Please login to manage wishlist");
      return;
    }
    try {
      if (wishlist.includes(prod._id)) {
        await api.delete(`/api/wishlist/${prod._id}`);
        setWishlist((prev) => prev.filter((id) => id !== prod._id));
      } else {
        await api.post(`/api/wishlist/${prod._id}`);
        setWishlist((prev) => Array.from(new Set([...prev, prod._id])));
      }
      window.dispatchEvent(new Event("wishlist:changed"));
    } catch (err) {
      console.error("Error toggling wishlist:", err);
      alert("Unable to update wishlist.");
    }
  };

  const handleShare = async () => {
    const productUrl = `${window.location.origin}/product/${product._id}`;
    const shareText = `Check out this beautiful ${
      product.title
    } from Snatchers! Only ₹${product.offerPrice ?? product.price}`;

    // Check if Web Share API is supported
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: shareText,
          url: productUrl,
        });
      } catch (err) {
        // User cancelled or error occurred, fallback to clipboard
        copyToClipboard(productUrl);
      }
    } else {
      // Fallback to clipboard
      copyToClipboard(productUrl);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // Show a temporary success message
      const button = document.querySelector("[data-share-button]");
      if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Copied!
        `;
        button.classList.add(
          "bg-green-50",
          "border-green-400",
          "text-green-600"
        );

        setTimeout(() => {
          button.innerHTML = originalText;
          button.classList.remove(
            "bg-green-50",
            "border-green-400",
            "text-green-600"
          );
        }, 2000);
      }
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      // Fallback: show the URL in an alert
      alert(`Share this product: ${text}`);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading product...</p>
        </div>
      </div>
    );

  if (!product)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Product not found
          </h2>
          <button
            onClick={() => navigate(-1)}
            className="text-red-600 hover:text-red-700 font-medium transition-colors"
          >
            ← Back to Products
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-red-600 hover:text-red-700 font-medium mb-8 focus:outline-none focus:ring-2 focus:ring-red-600 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-red-50"
          aria-label="Go back"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Products
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200"
        >
          <div className="flex flex-col lg:flex-row min-h-[600px]">
            {/* Images Section */}
            <div className="w-full lg:w-1/2 relative bg-gray-50">
              {/* Wishlist Button */}
              <button
                onClick={toggleWishlist}
                disabled={!token}
                className="absolute top-6 right-6 z-30 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl text-red-500 hover:text-red-700 hover:bg-white transition-all duration-300 disabled:text-gray-400 disabled:cursor-not-allowed shadow-lg"
                aria-label={
                  isWishlisted ? "Remove from wishlist" : "Add to wishlist"
                }
              >
                {isWishlisted ? <FaHeart /> : <FaRegHeart />}
              </button>

              {/* Enhanced Product Gallery */}
              <ProductGallery
                images={product.images}
                productTitle={product.title}
                badgeText={product.badgeText}
                badgeClass={product.badgeClass}
                enable360View={true}
              />
            </div>

            {/* Details Section */}
            <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center bg-white">
              {/* Product Title */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="mb-6"
              >
                <h1
                  className="text-3xl sm:text-4xl lg:text-5xl text-black-600 font-medium leading-tight"
                  style={{ fontFamily: "'Italiana', serif" }}
                >
                  {product.title}
                </h1>
                {product.category && (
                  <p className="text-sm text-gray-500 uppercase tracking-wider mt-2 font-medium">
                    {product.category}
                  </p>
                )}
              </motion.div>

              {/* Rating */}
              {/* <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="mb-6 flex items-center space-x-3"
              >
                <div className="flex items-center space-x-1">
                  {renderStars(product.rating)}
                </div>
                <span className="text-gray-500 text-sm font-medium">({product.rating}/5)</span>
                <div className="h-4 w-px bg-gray-300"></div>
                <span className="text-gray-500 text-sm">Premium Quality</span>
              </motion.div> */}

              {/* Price */}
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="mb-8"
              >
                <div className="flex items-baseline space-x-3">
                  {calculatedPrice.offerPrice ? (
                    <>
                      <span className="text-lg text-gray-500 line-through">
                        ₹{calculatedPrice.price}
                      </span>
                      <span className="text-3xl sm:text-4xl font-bold text-gray-900">
                        ₹{calculatedPrice.offerPrice}
                      </span>
                      <span className="text-sm text-gray-500">INR</span>
                      <span className="ml-3 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                        Offer
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl sm:text-4xl font-bold text-gray-900">
                        ₹{calculatedPrice.price}
                      </span>
                      <span className="text-sm text-gray-500">INR</span>
                    </>
                  )}
                </div>

                {/* Stock Status */}
                <div className="mt-2">
                  {isOutOfStock ? (
                    <span className="text-red-600 text-sm font-medium">
                      Out of Stock
                    </span>
                  ) : stockStatus === "low_stock" ? (
                    <span className="text-orange-600 text-sm font-medium">
                      Only few left in stock
                    </span>
                  ) : (
                    <span className="text-green-600 text-sm font-medium">
                      In Stock
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Product Variants */}
              {hasVariants && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                  className="mb-8"
                >
                  <ProductVariants
                    variants={variants}
                    selectedVariants={selectedVariants}
                    onVariantChange={updateVariant}
                  />
                </motion.div>
              )}

              {/* Description */}
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="mb-8"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Description
                </h3>
                <p className="text-gray-700 text-base leading-relaxed">
                  {product.description}
                </p>
              </motion.div>

              {/* Product Features */}
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.6 }}
                className="mb-8"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Features
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-4 h-4 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Premium Materials</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-4 h-4 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Handcrafted</span>
                  </div>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.7 }}
                className="space-y-4"
              >
                {/* Variant Selection Warning */}
                {hasVariants && !isValidSelection && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Please select all required options before adding to cart.
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={toggleCart}
                    disabled={
                      isOutOfStock || (hasVariants && !isValidSelection)
                    }
                    className={`flex-1 border-2 uppercase text-sm font-semibold py-4 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isInCart
                        ? "border-black text-black hover:bg-black hover:text-white bg-white"
                        : "border-black text-black hover:bg-black hover:text-white bg-white hover:shadow-lg"
                    }`}
                    type="button"
                  >
                    {isOutOfStock
                      ? "Out of Stock"
                      : isInCart
                      ? "Remove from Cart"
                      : "Add to Cart"}
                  </button>

                  <button
                    className="flex-1 bg-black hover:bg-gray-800 text-white uppercase text-sm font-semibold py-4 px-6 rounded-lg transition-all duration-300 hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                    onClick={() => navigate(`/buy-now/${product._id}`)}
                    disabled={
                      isOutOfStock || (hasVariants && !isValidSelection)
                    }
                    type="button"
                  >
                    Buy Now
                  </button>
                </div>

                {/* Share Button */}
                <div className="mt-4">
                  <button
                    onClick={handleShare}
                    data-share-button
                    className="w-full border-2 border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-700 bg-white py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                    type="button"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                      />
                    </svg>
                    Share Product
                  </button>
                </div>

                {/* Additional Info */}
                <div className="text-center text-xs text-gray-500 space-y-1">
                  <p>✓ Secure checkout with SSL encryption</p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
      {/* Reviews Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ReviewSystem productId={product._id} maxDisplayReviews={5} />
      </div>

      {/* Product-based Recommendations */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RecommendationCarousel
          title="Similar Products"
          type="product"
          productId={product._id}
          limit={8}
          showTitle={true}
        />
      </div>

      {/* Collaborative Filtering Recommendations */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RecommendationCarousel
          title="Customers Also Viewed"
          type="collaborative"
          limit={8}
          showTitle={true}
          className="bg-gray-50"
        />
      </div>
    </div>
  );
};

export default ProductDialog;
