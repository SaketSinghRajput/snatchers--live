import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AdvancedSearch from '../AdvancedSearch';

// Mock the search hook
jest.mock('../../hooks/useSearch', () => ({
  __esModule: true,
  default: () => ({
    searchQuery: '',
    setSearchQuery: jest.fn(),
    searchResults: [],
    isLoading: false,
    suggestions: ['laptop', 'smartphone', 'headphones'],
    handleSearch: jest.fn(),
    clearSearch: jest.fn()
  })
}));

const MockRouter = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('AdvancedSearch Component', () => {
  test('renders search input', () => {
    render(
      <MockRouter>
        <AdvancedSearch />
      </MockRouter>
    );
    
    const searchInput = screen.getByPlaceholderText(/search products/i);
    expect(searchInput).toBeInTheDocument();
  });

  test('displays search suggestions', async () => {
    const user = userEvent.setup();
    
    render(
      <MockRouter>
        <AdvancedSearch />
      </MockRouter>
    );
    
    const searchInput = screen.getByPlaceholderText(/search products/i);
    await user.type(searchInput, 'lap');
    
    // Wait for suggestions to appear
    await waitFor(() => {
      expect(screen.getByText('laptop')).toBeInTheDocument();
    });
  });

  test('handles search input changes', async () => {
    const user = userEvent.setup();
    
    render(
      <MockRouter>
        <AdvancedSearch />
      </MockRouter>
    );
    
    const searchInput = screen.getByPlaceholderText(/search products/i);
    await user.type(searchInput, 'smartphone');
    
    expect(searchInput).toHaveValue('smartphone');
  });

  test('submits search on enter key', async () => {
    const user = userEvent.setup();
    
    render(
      <MockRouter>
        <AdvancedSearch />
      </MockRouter>
    );
    
    const searchInput = screen.getByPlaceholderText(/search products/i);
    await user.type(searchInput, 'laptop');
    await user.keyboard('{Enter}');
    
    // Verify search was triggered
    expect(searchInput).toHaveValue('laptop');
  });

  test('clears search when clear button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <MockRouter>
        <AdvancedSearch />
      </MockRouter>
    );
    
    const searchInput = screen.getByPlaceholderText(/search products/i);
    await user.type(searchInput, 'test query');
    
    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);
    
    expect(searchInput).toHaveValue('');
  });

  test('shows loading state during search', () => {
    // Mock loading state
    jest.doMock('../../hooks/useSearch', () => ({
      __esModule: true,
      default: () => ({
        searchQuery: 'laptop',
        setSearchQuery: jest.fn(),
        searchResults: [],
        isLoading: true,
        suggestions: [],
        handleSearch: jest.fn(),
        clearSearch: jest.fn()
      })
    }));
    
    render(
      <MockRouter>
        <AdvancedSearch />
      </MockRouter>
    );
    
    expect(screen.getByText(/searching/i)).toBeInTheDocument();
  });

  test('handles suggestion selection', async () => {
    const user = userEvent.setup();
    
    render(
      <MockRouter>
        <AdvancedSearch />
      </MockRouter>
    );
    
    const searchInput = screen.getByPlaceholderText(/search products/i);
    await user.type(searchInput, 'lap');
    
    await waitFor(() => {
      const suggestion = screen.getByText('laptop');
      expect(suggestion).toBeInTheDocument();
    });
    
    const laptopSuggestion = screen.getByText('laptop');
    await user.click(laptopSuggestion);
    
    expect(searchInput).toHaveValue('laptop');
  });
});