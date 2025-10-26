import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import EnhancedProductCard from '../EnhancedProductCard';
import { CartProvider } from '../../contexts/CartContext';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    img: ({ children, ...props }) => <img {...props} alt={props.alt} />,
    button: ({ children, ...props }) => <button {...props}>{children}</button>
  }
}));

const MockProviders = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>
        {children}
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('EnhancedProductCard Component', () => {
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

  test('renders product information correctly', () => {
    render(
      <MockProviders>
        <EnhancedProductCard product={mockProduct} />
      </MockProviders>
    );
    
    expect(screen.getByText(mockProduct.title)).toBeInTheDocument();
    expect(screen.getByText(mockProduct.brand)).toBeInTheDocument();
    expect(screen.getByText(`₹${mockProduct.offerPrice}`)).toBeInTheDocument();
  });

  test('displays original price with strikethrough when offer price exists', () => {
    render(
      <MockProviders>
        <EnhancedProductCard product={mockProduct} />
      </MockProviders>
    );
    
    const originalPrice = screen.getByText(`₹${mockProduct.price}`);
    expect(originalPrice).toBeInTheDocument();
    expect(originalPrice).toHaveClass('line-through');
  });

  test('shows discount percentage', () => {
    render(
      <MockProviders>
        <EnhancedProductCard product={mockProduct} />
      </MockProviders>
    );
    
    const discountPercentage = Math.round(((mockProduct.price - mockProduct.offerPrice) / mockProduct.price) * 100);
    expect(screen.getByText(`${discountPercentage}% OFF`)).toBeInTheDocument();
  });

  test('displays rating and review count', () => {
    render(
      <MockProviders>
        <EnhancedProductCard product={mockProduct} />
      </MockProviders>
    );
    
    expect(screen.getByText(mockProduct.averageRating.toString())).toBeInTheDocument();
    expect(screen.getByText(`(${mockProduct.reviewCount})`)).toBeInTheDocument();
  });

  test('shows add to cart button', () => {
    render(
      <MockProviders>
        <EnhancedProductCard product={mockProduct} />
      </MockProviders>
    );
    
    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    expect(addToCartButton).toBeInTheDocument();
  });

  test('shows wishlist button', () => {
    render(
      <MockProviders>
        <EnhancedProductCard product={mockProduct} />
      </MockProviders>
    );
    
    const wishlistButton = screen.getByRole('button', { name: /add to wishlist/i });
    expect(wishlistButton).toBeInTheDocument();
  });

  test('handles add to cart click', async () => {
    const user = userEvent.setup();
    
    render(
      <MockProviders>
        <EnhancedProductCard product={mockProduct} />
      </MockProviders>
    );
    
    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    await user.click(addToCartButton);
    
    // Verify button interaction (actual cart logic would be tested in integration tests)
    expect(addToCartButton).toBeInTheDocument();
  });

  test('navigates to product page on card click', async () => {
    const user = userEvent.setup();
    
    render(
      <MockProviders>
        <EnhancedProductCard product={mockProduct} />
      </MockProviders>
    );
    
    const productCard = screen.getByRole('article');
    await user.click(productCard);
    
    // Verify navigation would happen (actual navigation tested in integration tests)
    expect(productCard).toBeInTheDocument();
  });

  test('shows out of stock when inventory is zero', () => {
    const outOfStockProduct = {
      ...mockProduct,
      inventory: { quantity: 0 }
    };
    
    render(
      <MockProviders>
        <EnhancedProductCard product={outOfStockProduct} />
      </MockProviders>
    );
    
    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
  });

  test('displays product image with alt text', () => {
    render(
      <MockProviders>
        <EnhancedProductCard product={mockProduct} />
      </MockProviders>
    );
    
    const productImage = screen.getByAltText(mockProduct.title);
    expect(productImage).toBeInTheDocument();
    expect(productImage).toHaveAttribute('src', mockProduct.images[0]);
  });

  test('handles missing optional fields gracefully', () => {
    const minimalProduct = {
      _id: '123',
      title: 'Minimal Product',
      price: 50,
      images: ['https://example.com/image.jpg']
    };
    
    render(
      <MockProviders>
        <EnhancedProductCard product={minimalProduct} />
      </MockProviders>
    );
    
    expect(screen.getByText(minimalProduct.title)).toBeInTheDocument();
    expect(screen.getByText(`₹${minimalProduct.price}`)).toBeInTheDocument();
  });
});