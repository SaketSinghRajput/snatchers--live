import React from 'react';
import { Helmet } from 'react-helmet-async';
import PropTypes from 'prop-types';

const ReviewSchema = ({ reviews, product, baseUrl = 'https://snatchers.in' }) => {
  if (!reviews || reviews.length === 0 || !product) return null;

  const generateReviewSchema = () => {
    return reviews.slice(0, 10).map(review => ({
      "@context": "https://schema.org/",
      "@type": "Review",
      "itemReviewed": {
        "@type": "Product",
        "name": product.title,
        "image": product.images?.[0] ? 
          (product.images[0].startsWith('http') ? product.images[0] : `${baseUrl}${product.images[0]}`) : 
          `${baseUrl}/images/default-product.jpg`,
        "url": `${baseUrl}/product/${product.slug || product._id}`,
        "sku": product.sku,
        "brand": {
          "@type": "Brand",
          "name": product.brand
        }
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": review.rating,
        "bestRating": 5,
        "worstRating": 1
      },
      "author": {
        "@type": "Person",
        "name": review.user?.name || "Anonymous User"
      },
      "reviewBody": review.comment,
      "datePublished": review.createdAt,
      "publisher": {
        "@type": "Organization",
        "name": "Snatchers"
      }
    }));
  };

  const generateAggregateRatingSchema = () => {
    if (!product.averageRating || !product.reviewCount) return null;

    return {
      "@context": "https://schema.org/",
      "@type": "AggregateRating",
      "itemReviewed": {
        "@type": "Product",
        "name": product.title,
        "image": product.images?.[0] ? 
          (product.images[0].startsWith('http') ? product.images[0] : `${baseUrl}${product.images[0]}`) : 
          `${baseUrl}/images/default-product.jpg`,
        "url": `${baseUrl}/product/${product.slug || product._id}`
      },
      "ratingValue": product.averageRating,
      "reviewCount": product.reviewCount,
      "bestRating": 5,
      "worstRating": 1
    };
  };

  const reviewSchemas = generateReviewSchema();
  const aggregateRatingSchema = generateAggregateRatingSchema();

  return (
    <Helmet>
      {/* Individual Review Schemas */}
      {reviewSchemas.map((schema, index) => (
        <script key={`review-${index}`} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
      
      {/* Aggregate Rating Schema */}
      {aggregateRatingSchema && (
        <script type="application/ld+json">
          {JSON.stringify(aggregateRatingSchema)}
        </script>
      )}
    </Helmet>
  );
};

ReviewSchema.propTypes = {
  reviews: PropTypes.arrayOf(PropTypes.shape({
    rating: PropTypes.number.isRequired,
    comment: PropTypes.string,
    createdAt: PropTypes.string.isRequired,
    user: PropTypes.shape({
      name: PropTypes.string
    })
  })).isRequired,
  product: PropTypes.shape({
    _id: PropTypes.string,
    title: PropTypes.string.isRequired,
    images: PropTypes.arrayOf(PropTypes.string),
    sku: PropTypes.string,
    brand: PropTypes.string,
    slug: PropTypes.string,
    averageRating: PropTypes.number,
    reviewCount: PropTypes.number
  }).isRequired,
  baseUrl: PropTypes.string
};

export default ReviewSchema;