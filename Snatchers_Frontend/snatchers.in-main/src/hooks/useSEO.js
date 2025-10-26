import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

const useSEO = (pageData = {}) => {
  const location = useLocation();
  const baseUrl = process.env.REACT_APP_BASE_URL || 'https://snatchers.in';

  const seoData = useMemo(() => {
    const {
      title,
      description,
      keywords = [],
      image,
      type = 'website',
      product,
      category,
      breadcrumbs = []
    } = pageData;

    // Generate page-specific SEO data based on route
    const generatePageSEO = () => {
      const pathname = location.pathname;
      
      // Default SEO data
      let defaultSEO = {
        title: 'Snatchers - Your Ultimate Shopping Destination',
        description: 'Discover amazing products at unbeatable prices. Shop electronics, fashion, home & garden, and more with fast delivery and secure payments.',
        keywords: ['online shopping', 'ecommerce', 'electronics', 'fashion', 'home decor', 'deals', 'discounts'],
        image: '/images/og-default.jpg',
        type: 'website'
      };

      // Route-specific SEO
      if (pathname === '/') {
        defaultSEO = {
          ...defaultSEO,
          title: 'Snatchers - Best Online Shopping Experience in India',
          description: 'Shop the latest electronics, fashion, home & garden products at unbeatable prices. Free shipping, easy returns, and secure payments.',
          keywords: [...defaultSEO.keywords, 'best deals', 'online store', 'shopping india']
        };
      } else if (pathname === '/shop') {
        defaultSEO = {
          ...defaultSEO,
          title: 'Shop All Products - Snatchers',
          description: 'Browse our complete collection of products across all categories. Find the best deals on electronics, fashion, and more.',
          keywords: [...defaultSEO.keywords, 'all products', 'browse', 'catalog']
        };
      } else if (pathname === '/mens') {
        defaultSEO = {
          ...defaultSEO,
          title: 'Men\'s Fashion & Accessories - Snatchers',
          description: 'Discover the latest men\'s fashion, clothing, and accessories. Shop shirts, pants, shoes, and more at great prices.',
          keywords: ['mens fashion', 'mens clothing', 'mens accessories', 'shirts', 'pants', 'shoes']
        };
      } else if (pathname === '/womens') {
        defaultSEO = {
          ...defaultSEO,
          title: 'Women\'s Fashion & Accessories - Snatchers',
          description: 'Explore trendy women\'s fashion, clothing, and accessories. Shop dresses, tops, bags, and more at affordable prices.',
          keywords: ['womens fashion', 'womens clothing', 'womens accessories', 'dresses', 'tops', 'bags']
        };
      } else if (pathname.startsWith('/product/')) {
        if (product) {
          defaultSEO = {
            title: `${product.title} - Buy Online at Best Price`,
            description: product.description || product.shortDescription || `Buy ${product.title} online at the best price. ${product.brand ? `${product.brand} ` : ''}Free shipping and easy returns.`,
            keywords: [
              product.title.toLowerCase(),
              product.brand?.toLowerCase(),
              product.category?.toLowerCase(),
              'buy online',
              'best price'
            ].filter(Boolean),
            image: product.images?.[0],
            type: 'product'
          };
        }
      } else if (pathname === '/about') {
        defaultSEO = {
          ...defaultSEO,
          title: 'About Snatchers - Your Trusted Shopping Partner',
          description: 'Learn about Snatchers, your trusted online shopping destination. Discover our mission, values, and commitment to customer satisfaction.',
          keywords: ['about snatchers', 'company info', 'mission', 'values', 'customer service']
        };
      } else if (pathname === '/contact') {
        defaultSEO = {
          ...defaultSEO,
          title: 'Contact Us - Snatchers Customer Support',
          description: 'Get in touch with Snatchers customer support. We\'re here to help with your orders, returns, and any questions you may have.',
          keywords: ['contact', 'customer support', 'help', 'customer service', 'support']
        };
      }

      return defaultSEO;
    };

    const pageSEO = generatePageSEO();

    // Merge provided data with page-specific defaults
    return {
      title: title || pageSEO.title,
      description: description || pageSEO.description,
      keywords: keywords.length > 0 ? keywords : pageSEO.keywords,
      image: image || pageSEO.image,
      type: type || pageSEO.type,
      url: `${baseUrl}${location.pathname}${location.search}`,
      canonical: `${baseUrl}${location.pathname}`,
      breadcrumbs: breadcrumbs.length > 0 ? breadcrumbs : generateBreadcrumbs(location.pathname, category, product)
    };
  }, [pageData, location, baseUrl]);

  return seoData;
};

// Helper function to generate breadcrumbs based on pathname
const generateBreadcrumbs = (pathname, category, product) => {
  const breadcrumbs = [{ name: 'Home', url: '/' }];
  
  const pathSegments = pathname.split('/').filter(Boolean);
  
  pathSegments.forEach((segment, index) => {
    const url = '/' + pathSegments.slice(0, index + 1).join('/');
    
    switch (segment) {
      case 'shop':
        breadcrumbs.push({ name: 'Shop', url });
        break;
      case 'mens':
        breadcrumbs.push({ name: 'Men\'s Fashion', url });
        break;
      case 'womens':
        breadcrumbs.push({ name: 'Women\'s Fashion', url });
        break;
      case 'about':
        breadcrumbs.push({ name: 'About Us', url });
        break;
      case 'contact':
        breadcrumbs.push({ name: 'Contact Us', url });
        break;
      case 'product':
        if (category) {
          breadcrumbs.push({ name: category, url: `/category/${category.toLowerCase()}` });
        }
        if (product) {
          breadcrumbs.push({ name: product.title });
        }
        break;
      default:
        // Capitalize first letter for unknown segments
        const name = segment.charAt(0).toUpperCase() + segment.slice(1);
        breadcrumbs.push({ name, url });
    }
  });
  
  return breadcrumbs;
};

export default useSEO;