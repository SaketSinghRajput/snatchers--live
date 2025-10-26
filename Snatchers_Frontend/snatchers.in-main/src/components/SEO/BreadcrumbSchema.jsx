import React from 'react';
import { Helmet } from 'react-helmet-async';
import PropTypes from 'prop-types';

const BreadcrumbSchema = ({ breadcrumbs, baseUrl = 'https://snatchers.in' }) => {
  if (!breadcrumbs || breadcrumbs.length === 0) return null;

  const generateBreadcrumbSchema = () => {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbs.map((breadcrumb, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": breadcrumb.name,
        "item": breadcrumb.url ? 
          (breadcrumb.url.startsWith('http') ? breadcrumb.url : `${baseUrl}${breadcrumb.url}`) : 
          undefined
      }))
    };
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(generateBreadcrumbSchema())}
      </script>
    </Helmet>
  );
};

BreadcrumbSchema.propTypes = {
  breadcrumbs: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    url: PropTypes.string // Optional for the last breadcrumb (current page)
  })).isRequired,
  baseUrl: PropTypes.string
};

export default BreadcrumbSchema;