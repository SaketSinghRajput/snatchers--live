import React from 'react';
import { Helmet } from 'react-helmet-async';
import PropTypes from 'prop-types';

const WebsiteSchema = ({ 
  name = 'Snatchers',
  url = 'https://snatchers.in',
  description = 'Your Ultimate Shopping Destination - Discover amazing products at unbeatable prices.',
  searchUrl = 'https://snatchers.in/search?q={search_term_string}'
}) => {
  const generateWebsiteSchema = () => {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": name,
      "url": url,
      "description": description,
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": searchUrl
        },
        "query-input": "required name=search_term_string"
      },
      "publisher": {
        "@type": "Organization",
        "name": name,
        "url": url
      }
    };
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(generateWebsiteSchema())}
      </script>
    </Helmet>
  );
};

WebsiteSchema.propTypes = {
  name: PropTypes.string,
  url: PropTypes.string,
  description: PropTypes.string,
  searchUrl: PropTypes.string
};

export default WebsiteSchema;