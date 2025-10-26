# Filter Function Fix Guide

## Issues Diagnosed and Fixed

### 1. **Filter State Management Issues**
- **Problem**: Filter changes weren't properly propagating from `FilterSidebar` to the parent component
- **Fix**: Updated `updateFilter` and `toggleArrayFilter` functions to properly handle state updates and callbacks

### 2. **Event Handler Issues**
- **Problem**: Checkbox onChange events weren't preventing default behavior, causing potential conflicts
- **Fix**: Added `handleCheckboxChange` function that properly prevents default and stops propagation

### 3. **Aggregation Key Mismatch**
- **Problem**: Mobile filter drawer was using wrong keys (`category.name`, `brand.name`) instead of (`category.key`, `brand.key`)
- **Fix**: Updated MobileFilterDrawer to use correct aggregation keys matching the backend response

### 4. **Empty Filter Handling**
- **Problem**: Empty filter arrays weren't being properly removed from the filter object
- **Fix**: Added logic to delete filter keys when arrays are empty

## Changes Made

### Files Modified:

1. **`src/components/FilterSidebar.jsx`**
   - Fixed `updateFilter` function to properly delete empty filters
   - Fixed `toggleArrayFilter` to properly manage array filters
   - Added `handleCheckboxChange` for better event handling
   - Added hover effects and cursor-pointer class for better UX
   - Added empty state messages when no brands/categories available
   - Added debug console logs

2. **`src/components/Mobile/MobileFilterDrawer.jsx`**
   - Fixed aggregation key mapping (category.key instead of category.name)
   - Fixed filter state keys (categories/brands instead of category/brand)
   - Improved handleFilterChange to properly delete empty arrays

3. **`src/hooks/useSearch.js`**
   - Added console logging to track filter changes
   - Added search parameter logging for debugging

## Testing Instructions

### Step 1: Start the Development Server
```powershell
cd f:\Projects\abhi\live\Snatchers\Snatchers_Frontend\snatchers.in-main
npm start
```

### Step 2: Open Browser Console
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Clear console to see fresh logs

### Step 3: Test Filters

#### Desktop Testing:
1. Navigate to `/shop` page
2. Look at the left sidebar with filters
3. Try clicking on:
   - Brand checkboxes
   - Category checkboxes
   - Price range inputs
   - Rating options
   - In Stock checkbox

#### Mobile Testing:
1. Resize browser to mobile view (< 768px) or use mobile emulator
2. Click the "Filters" button at the bottom
3. Test the same filter options in the drawer

### Step 4: Monitor Console Logs

You should see logs like:
```
Filter checkbox clicked: brands "Nike"
Current filters before change: { ... }
FilterSidebar - localFilters updated: { brands: ["Nike"] }
Setting filters: { brands: ["Nike"] }
Performing search with params: { q: "", page: 1, limit: 20, sortBy: "relevance", brands: "Nike" }
Search response: { success: true, data: { products: [...], aggregations: {...} } }
```

### Step 5: Verify Functionality

Check that:
- ✅ Clicking a filter checkbox updates the URL parameters
- ✅ Products list updates with filtered results
- ✅ Active filters appear in the "Active Filters" section
- ✅ Clicking "X" on an active filter removes it
- ✅ "Clear All" button works
- ✅ Multiple filters can be selected
- ✅ Filter counts update correctly
- ✅ Price range inputs work
- ✅ Rating filter works

## Common Issues and Solutions

### Issue 1: Filters not showing up
**Symptoms**: Filter sidebar is empty or shows "No brands/categories available"
**Solutions**:
1. Check if products exist in database
2. Verify backend SearchService is returning aggregations
3. Check browser console for API errors
4. Run: `GET http://localhost:5000/search` to test backend directly

### Issue 2: Clicking filters doesn't update products
**Symptoms**: Checkbox gets checked but products don't change
**Solutions**:
1. Check console logs for "Setting filters:" and "Performing search with params:"
2. Verify the search API is being called (Network tab in DevTools)
3. Check if backend is receiving the filter parameters correctly
4. Ensure MongoDB has products matching the filter criteria

### Issue 3: Backend returns 500 error
**Symptoms**: Search returns error in console
**Solutions**:
1. Check if Elasticsearch is running (if configured)
2. Check MongoDB connection
3. Look at backend server logs
4. The system has a fallback to MongoDB search if Elasticsearch fails

### Issue 4: Aggregations are empty
**Symptoms**: No filter options appear
**Solutions**:
1. Ensure products have brand and category fields populated
2. Check if products have status: 'active'
3. Reindex products if using Elasticsearch:
   ```bash
   curl -X POST http://localhost:5000/search/reindex
   ```

## Backend Configuration Check

### Verify Elasticsearch Status:
```powershell
# Check if Elasticsearch is running
curl http://localhost:9200

# Check product index
curl http://localhost:9200/products/_search
```

### Verify MongoDB Products:
```javascript
// In MongoDB shell or Compass
db.products.find({ status: 'active' }).limit(5)
db.products.distinct('brand')
db.products.distinct('category')
```

## Debugging Commands

### Test Search API Directly:
```powershell
# Search with brand filter
curl "http://localhost:5000/search?brands=Nike&page=1&limit=20"

# Search with category filter
curl "http://localhost:5000/search?categories=Shoes&page=1&limit=20"

# Search with price range
curl "http://localhost:5000/search?priceMin=500&priceMax=2000&page=1&limit=20"
```

## Performance Optimization

The filter system includes:
- ✅ Debounced search (300ms delay)
- ✅ Request cancellation for outdated searches
- ✅ URL parameter synchronization
- ✅ Efficient state management
- ✅ Fallback to MongoDB if Elasticsearch unavailable

## Next Steps

If filters are still not working after these fixes:

1. **Check Backend Logs**: Look for errors in the backend console
2. **Verify Data**: Ensure products have the required fields (brand, category, price)
3. **Test API Directly**: Use the curl commands above to test the backend
4. **Browser Cache**: Clear browser cache and hard reload (Ctrl+Shift+R)
5. **Restart Services**: Restart both frontend and backend servers

## Remove Debug Logs (Production)

Before deploying to production, remove console.log statements from:
- `src/hooks/useSearch.js`
- `src/components/FilterSidebar.jsx`

Or use a build tool to strip them automatically.

## Support

If issues persist, check:
1. Browser console for JavaScript errors
2. Network tab for failed API requests
3. Backend server logs for errors
4. MongoDB/Elasticsearch connection status
