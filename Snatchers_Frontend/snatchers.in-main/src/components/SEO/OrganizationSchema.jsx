import React from 'react';
import { Helmet } from 'react-helmet-async';
import PropTypes from 'prop-types';

const OrganizationSchema = ({ 
  name = 'Snatchers',
  url = 'https://snatchers.in',
  logo = '/images/logo.png',
  description = 'Your Ultimate Shopping Destination - Discover amazing products at unbeatable prices.',
  contactInfo = {},
  socialMedia = {},
  address = {}
}) => {
  const generateOrganizationSchema = () => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": name,
      "url": url,
      "logo": logo.startsWith('http') ? logo : `${url}${logo}`,
      "description": description,
      "foundingDate": "2024",
      "sameAs": Object.values(socialMedia).filter(Boolean)
    };

    // Add contact information if provided
    if (Object.keys(contactInfo).length > 0) {
      schema.contactPoint = {
        "@type": "ContactPoint",
        "telephone": contactInfo.phone,
        "contactType": "customer service",
        "email": contactInfo.email,
        "availableLanguage": ["English", "Hindi"]
      };
    }

    // Add address if provided
    if (Object.keys(address).length > 0) {
      schema.address = {
        "@type": "PostalAddress",
        "streetAddress": address.street,
        "addressLocality": address.city,
        "addressRegion": address.state,
        "postalCode": address.zipCode,
        "addressCountry": address.country || "IN"
      };
    }

    return schema;
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(generateOrganizationSchema())}
      </script>
    </Helmet>
  );
};

OrganizationSchema.propTypes = {
  name: PropTypes.string,
  url: PropTypes.string,
  logo: PropTypes.string,
  description: PropTypes.string,
  contactInfo: PropTypes.shape({
    phone: PropTypes.string,
    email: PropTypes.string
  }),
  socialMedia: PropTypes.shape({
    facebook: PropTypes.string,
    twitter: PropTypes.string,
    instagram: PropTypes.string,
    linkedin: PropTypes.string
  }),
  address: PropTypes.shape({
    street: PropTypes.string,
    city: PropTypes.string,
    state: PropTypes.string,
    zipCode: PropTypes.string,
    country: PropTypes.string
  })
};

export default OrganizationSchema;