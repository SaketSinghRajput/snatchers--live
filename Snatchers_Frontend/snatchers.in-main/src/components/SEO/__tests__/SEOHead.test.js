import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import SEOHead from '../SEOHead';

const renderWithHelmet = (component) => {
  return render(
    <HelmetProvider>
      {component}
    </HelmetProvider>
  );
};

describe('SEOHead Component', () => {
  test('renders with default props', () => {
    renderWithHelmet(<SEOHead />);
    
    // Check if helmet is properly configured
    const helmet = document.querySelector('head');
    expect(helmet).toBeInTheDocument();
  });

  test('sets custom title and description', () => {
    const title = 'Test Product Page';
    const description = 'This is a test product description';
    
    renderWithHelmet(
      <SEOHead 
        title={title}
        description={description}
      />
    );
    
    // Check if title is set
    expect(document.title).toContain(title);
    
    // Check if meta description is set
    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription).toHaveAttribute('content', description);
  });

  test('sets Open Graph meta tags', () => {
    const ogData = {
      title: 'OG Title',
      description: 'OG Description',
      image: 'https://example.com/image.jpg',
      url: 'https://example.com/page'
    };
    
    renderWithHelmet(
      <SEOHead 
        title={ogData.title}
        description={ogData.description}
        image={ogData.image}
        url={ogData.url}
      />
    );
    
    // Check Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const ogImage = document.querySelector('meta[property="og:image"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    
    expect(ogTitle).toHaveAttribute('content', ogData.title);
    expect(ogDescription).toHaveAttribute('content', ogData.description);
    expect(ogImage).toHaveAttribute('content', ogData.image);
    expect(ogUrl).toHaveAttribute('content', ogData.url);
  });

  test('sets Twitter Card meta tags', () => {
    const twitterData = {
      title: 'Twitter Title',
      description: 'Twitter Description',
      image: 'https://example.com/twitter-image.jpg'
    };
    
    renderWithHelmet(
      <SEOHead 
        title={twitterData.title}
        description={twitterData.description}
        image={twitterData.image}
      />
    );
    
    // Check Twitter Card tags
    const twitterCard = document.querySelector('meta[name="twitter:card"]');
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    
    expect(twitterCard).toHaveAttribute('content', 'summary_large_image');
    expect(twitterTitle).toHaveAttribute('content', twitterData.title);
    expect(twitterDescription).toHaveAttribute('content', twitterData.description);
    expect(twitterImage).toHaveAttribute('content', twitterData.image);
  });

  test('sets canonical URL', () => {
    const canonicalUrl = 'https://example.com/canonical';
    
    renderWithHelmet(
      <SEOHead url={canonicalUrl} />
    );
    
    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical).toHaveAttribute('href', canonicalUrl);
  });
});