import React from 'react';
import { Helmet } from 'react-helmet-async';
import PropTypes from 'prop-types';

const ProductSchema = ({ product, reviews = [], baseUrl = 'https://snatchers.in' }) => {
  if (!product) return null;

  const generateProductSchema = () => {
    const schema = {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.title,
      "description": product.description || product.shortDescription || product.title,
      "sku": product.sku,
      "brand": {
        "@type": "Brand",
        "name": product.brand
      },
      "category": product.category,
      "image": product.images?.map(img => 
        img.startsWith('http') ? img : `${baseUrl}${img}`
      ) || [],
      "url": `${baseUrl}/product/${product.slug || product._id}`,
      "offers": {
        "@type": "Offer",
        "price": product.offerPrice || product.price,
        "priceCurrency": "INR",
        "availability": product.inventory?.quantity > 0 
          ? "https://schema.org/InStock" 
          : "https://schema.org/OutOfStock",
        "seller": {
          "@type": "Organization",
          "name": "Snatchers"
        },
        "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
      }
    };

    // Add aggregateRating if reviews exist
    if (reviews.length > 0 && product.averageRating) {
      schema.aggregateRating = {
        "@type": "AggregateRating",
        "ratingValue": product.averageRating,
        "reviewCount": product.reviewCount || reviews.length,
        "bestRating": 5,
        "worstRating": 1
      };
    }

    // Add individual reviews
    if (reviews.length > 0) {
      schema.review = reviews.slice(0, 5).map(review => ({
        "@type": "Review",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": review.rating,
          "bestRating": 5,
          "worstRating": 1
        },
        "author": {
          "@type": "Person",
          "name": review.user?.name || "Anonymous"
        },
        "reviewBody": review.comment,
        "datePublished": review.createdAt
      }));
    }

    // Add product specifications if available
    if (product.specifications && product.specifications.length > 0) {
      schema.additionalProperty = product.specifications.map(spec => ({
        "@type": "PropertyValue",
        "name": spec.name,
        "value": spec.value
      }));
    }

    // Add dimensions if available
    if (product.dimensions) {
      schema.depth = {
        "@type": "QuantitativeValue",
        "value": product.dimensions.length,
        "unitCode": "CMT"
      };
      schema.width = {
        "@type": "QuantitativeValue",
        "value": product.dimensions.width,
        "unitCode": "CMT"
      };
      schema.height = {
        "@type": "QuantitativeValue",
        "value": product.dimensions.height,
        "unitCode": "CMT"
      };
    }

    // Add weight if available
    if (product.weight) {
      schema.weight = {
        "@type": "QuantitativeValue",
        "value": product.weight,
        "unitCode": "KGM"
      };
    }

    return schema;
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(generateProductSchema())}
      </script>
    </Helmet>
  );
};

ProductSchema.propTypes = {
  product: PropTypes.shape({
    _id: PropTypes.string,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    shortDescription: PropTypes.string,
    sku: PropTypes.string,
    brand: PropTypes.string,
    category: PropTypes.string,
    images: PropTypes.arrayOf(PropTypes.string),
    price: PropTypes.number.isRequired,
    offerPrice: PropTypes.number,
    averageRating: PropTypes.number,
    reviewCount: PropTypes.number,
    inventory: PropTypes.shape({
      quantity: PropTypes.number
    }),
    specifications: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.string
    })),
    dimensions: PropTypes.shape({
      length: PropTypes.number,
      width: PropTypes.number,
      height: PropTypes.number
    }),
    weight: PropTypes.number,
    slug: PropTypes.string
  }).isRequired,
  reviews: PropTypes.arrayOf(PropTypes.shape({
    rating: PropTypes.number,
    comment: PropTypes.string,
    createdAt: PropTypes.string,
    user: PropTypes.shape({
      name: PropTypes.string
    })
  })),
  baseUrl: PropTypes.string
};

export default ProductSchema;