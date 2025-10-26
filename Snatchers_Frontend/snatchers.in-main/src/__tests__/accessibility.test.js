import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from '../App';
import { AuthProvider } from '../contexts/AuthContext';
import { CartProvider } from '../contexts/CartContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { PWAProvider } from '../contexts/PWAContext';
import { RecommendationProvider } from '../contexts/RecommendationContext';
import EnhancedProductCard from '../components/EnhancedProductCard';
import AdvancedSearch from '../components/AdvancedSearch';
import CartDrawer from '../components/Cart/CartDrawer';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock Firebase and other external dependencies
jest.mock('../Firebase/Firebase.js', () => ({
  auth: {},
  db: {},
  storage: {}
}));

jest.mock('amazon-cognito-identity-js', () => ({
  CognitoUserPool: jest.fn(),
  CognitoUser: jest.fn(),
  AuthenticationDetails: jest.fn()
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    img: ({ children, ...props }) => <img {...props} alt={props.alt} />,
    button: ({ children, ...props }) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }) => children
}));

const AllProviders = ({ children }) => (
  <BrowserRouter>
    <HelmetProvider>
      <AuthProvider>
        <CartProvider>
          <NotificationProvider>
            <PWAProvider>
              <RecommendationProvider>
                {children}
              </RecommendationProvider>
            </PWAProvider>
          </NotificationProvider>
        </CartProvider>
      </AuthProvider>
    </HelmetProvider>
  </BrowserRouter>
);

describe('Accessibility Tests', () => {
  test('App component should not have accessibility violations', async () => {
    const { container } = render(
      <AllProviders>
        <App />
      </AllProviders>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('EnhancedProductCard should not have accessibility violations', async () => {
    const mockProduct = {
      _id: '123',
      title: 'Test Product',
      price: 99.99,
      offerPrice: 79.99,
      images: ['https://example.com/image1.jpg'],
      brand: 'Test Brand',
      category: 'Electronics',
      averageRating: 4.5,
      reviewCount: 10,
      inventory: { quantity: 5 },
      seo: { slug: 'test-product' }
    };

    const { container } = render(
      <AllProviders>
        <EnhancedProductCard product={mockProduct} />
      </AllProviders>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('AdvancedSearch should not have accessibility violations', async () => {
    const { container } = render(
      <AllProviders>
        <AdvancedSearch />
      </AllProviders>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('CartDrawer should not have accessibility violations', async () => {
    const { container } = render(
      <AllProviders>
        <CartDrawer isOpen={true} onClose={() => {}} />
      </AllProviders>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('Components should have proper ARIA labels', () => {
    const mockProduct = {
      _id: '123',
      title: 'Test Product',
      price: 99.99,
      images: ['https://example.com/image1.jpg']
    };

    const { container } = render(
      <AllProviders>
        <EnhancedProductCard product={mockProduct} />
      </AllProviders>
    );
    
    // Check for proper ARIA labels
    const productCard = container.querySelector('[role="article"]');
    expect(productCard).toBeInTheDocument();
    
    const addToCartButton = container.querySelector('button[aria-label*="Add to cart"]');
    expect(addToCartButton).toBeInTheDocument();
  });

  test('Images should have proper alt text', () => {
    const mockProduct = {
      _id: '123',
      title: 'Test Product',
      price: 99.99,
      images: ['https://example.com/image1.jpg']
    };

    const { container } = render(
      <AllProviders>
        <EnhancedProductCard product={mockProduct} />
      </AllProviders>
    );
    
    const productImage = container.querySelector('img');
    expect(productImage).toHaveAttribute('alt');
    expect(productImage.getAttribute('alt')).toBeTruthy();
  });

  test('Interactive elements should be keyboard accessible', () => {
    const { container } = render(
      <AllProviders>
        <AdvancedSearch />
      </AllProviders>
    );
    
    const searchInput = container.querySelector('input[type="text"]');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).not.toHaveAttribute('tabindex', '-1');
    
    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      expect(button).not.toHaveAttribute('tabindex', '-1');
    });
  });

  test('Form elements should have proper labels', () => {
    const { container } = render(
      <AllProviders>
        <AdvancedSearch />
      </AllProviders>
    );
    
    const searchInput = container.querySelector('input[type="text"]');
    expect(searchInput).toHaveAttribute('placeholder');
    
    // Check for associated label or aria-label
    const hasLabel = searchInput.hasAttribute('aria-label') || 
                    searchInput.hasAttribute('aria-labelledby') ||
                    container.querySelector('label[for="' + searchInput.id + '"]');
    expect(hasLabel).toBeTruthy();
  });

  test('Color contrast should be sufficient', async () => {
    const { container } = render(
      <AllProviders>
        <AdvancedSearch />
      </AllProviders>
    );
    
    // Run axe with color-contrast rule specifically
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });
    
    expect(results).toHaveNoViolations();
  });
});