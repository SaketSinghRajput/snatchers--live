# Quick Filter Test Checklist

## Before Testing
- [ ] Backend server is running
- [ ] Frontend development server is running  
- [ ] Browser DevTools console is open
- [ ] You're on the `/shop` page

## Desktop Filter Tests

### Brand Filter Test
1. [ ] Click on any brand checkbox in the left sidebar
2. [ ] Verify checkbox gets checked/unchecked
3. [ ] Verify URL updates with `?brands=BrandName`
4. [ ] Verify products list refreshes
5. [ ] Verify active filter chip appears at top
6. [ ] Verify you can select multiple brands
7. [ ] Click "X" on filter chip to remove it
8. [ ] Verify products list updates again

**Expected Console Logs:**
```
Filter checkbox clicked: brands "Nike"
Current filters before change: {}
FilterSidebar - localFilters updated: {brands: ["Nike"]}
Setting filters: {brands: ["Nike"]}
Performing search with params: {q: "", brands: "Nike", ...}
```

### Category Filter Test
1. [ ] Click on any category checkbox
2. [ ] Verify checkbox state changes
3. [ ] Verify URL updates with `?categories=CategoryName`
4. [ ] Verify products filter by category
5. [ ] Try combining with brand filter
6. [ ] Verify both filters work together

### Price Range Filter Test
1. [ ] Enter a minimum price (e.g., 500)
2. [ ] Enter a maximum price (e.g., 2000)
3. [ ] Verify URL updates with `?priceMin=500&priceMax=2000`
4. [ ] Verify only products in that range show
5. [ ] Click a quick price range button
6. [ ] Verify inputs update automatically

**OR try quick buttons:**
1. [ ] Click "Under ₹500"
2. [ ] Click "₹500-₹1000"
3. [ ] Click "₹1000-₹2500"
4. [ ] Click "Above ₹2500"

### Rating Filter Test
1. [ ] Click "4★ & Up"
2. [ ] Verify only 4+ star products show
3. [ ] Try other rating options
4. [ ] Verify URL updates with `?rating=4`

### In Stock Filter Test
1. [ ] Check "In Stock Only"
2. [ ] Verify out-of-stock products disappear
3. [ ] Uncheck it
4. [ ] Verify all products return

### Clear All Test
1. [ ] Apply multiple filters
2. [ ] Click "Clear All" button
3. [ ] Verify all filters are removed
4. [ ] Verify all products return
5. [ ] Verify URL clears parameters

## Mobile Filter Tests

### Open Mobile View
1. [ ] Resize browser to < 768px width
2. [ ] OR use DevTools mobile emulator
3. [ ] Click "Filters" button at bottom

### Mobile Filter Drawer
1. [ ] Verify filter drawer slides up from bottom
2. [ ] Test category checkboxes
3. [ ] Test brand checkboxes
4. [ ] Test price range inputs
5. [ ] Test rating selection
6. [ ] Click "Apply Filters" button
7. [ ] Verify drawer closes
8. [ ] Verify products update
9. [ ] Reopen drawer
10. [ ] Click "Clear All" button
11. [ ] Verify filters reset

### Mobile Specific
1. [ ] Check tap targets are large enough (44px minimum)
2. [ ] Verify smooth animations
3. [ ] Test closing by tapping backdrop
4. [ ] Test closing by "X" button

## Sort & View Tests

### Sort Options
1. [ ] Sort by "Price: Low to High"
2. [ ] Verify products reorder
3. [ ] Try other sort options:
   - [ ] Price: High to Low
   - [ ] Rating
   - [ ] Popularity
   - [ ] Newest
4. [ ] Verify each works with active filters

### View Mode
1. [ ] Click Grid view button
2. [ ] Click List view button
3. [ ] Verify layout changes
4. [ ] Verify works on mobile too

## Advanced Tests

### Multiple Filters Combined
1. [ ] Select 2+ brands
2. [ ] Select 1+ category
3. [ ] Set price range
4. [ ] Set minimum rating
5. [ ] Verify all work together
6. [ ] Verify product count updates
7. [ ] Verify URL has all parameters

### Pagination with Filters
1. [ ] Apply a filter
2. [ ] Verify page resets to 1
3. [ ] Go to page 2
4. [ ] Change filter
5. [ ] Verify returns to page 1
6. [ ] Verify filter stays active across pages

### Browser Back/Forward
1. [ ] Apply a filter
2. [ ] Apply another filter
3. [ ] Click browser back button
4. [ ] Verify previous filter state restores
5. [ ] Click forward
6. [ ] Verify filter state updates

### Direct URL Access
1. [ ] Copy URL with filters: `/shop?brands=Nike&categories=Shoes&priceMin=500`
2. [ ] Open in new tab
3. [ ] Verify filters are applied from URL
4. [ ] Verify checkboxes are checked
5. [ ] Verify products are filtered

## Error Scenarios

### No Results
1. [ ] Apply filters that return 0 products
2. [ ] Verify "No products found" message
3. [ ] Verify filter UI still works
4. [ ] Clear filters to show products again

### Network Error
1. [ ] Stop backend server
2. [ ] Try applying filter
3. [ ] Verify error message shows
4. [ ] Restart backend
5. [ ] Try again - should work

### Invalid Filter Values
1. [ ] Enter negative price
2. [ ] Enter price Min > Max
3. [ ] Verify system handles gracefully

## Performance Tests

### Quick Clicks
1. [ ] Rapidly click multiple filter checkboxes
2. [ ] Verify system handles debouncing
3. [ ] Verify only final state is searched
4. [ ] Check console for request cancellation

### Large Filter Lists
1. [ ] If many brands/categories exist
2. [ ] Verify scrolling works in filter sections
3. [ ] Verify checkboxes remain clickable
4. [ ] Verify no lag when selecting

## Troubleshooting

### If filters don't work:

1. **Check Console Logs**
   - Look for "Filter checkbox clicked"
   - Look for "Setting filters"
   - Look for "Performing search with params"
   - Look for any error messages

2. **Check Network Tab**
   - Open DevTools Network tab
   - Filter by "search"
   - Click a filter
   - Verify API request is made
   - Check request URL has filter params
   - Check response has filtered products

3. **Check Backend**
   - Backend terminal should show search requests
   - Check for any error logs
   - Verify MongoDB connection
   - Test API directly with curl

4. **Common Issues**
   - Cache: Hard reload (Ctrl+Shift+R)
   - Aggregations empty: No products in DB
   - 500 error: Backend issue
   - No products: Database empty or filters too restrictive

## Success Criteria

All tests should pass with:
- ✅ Smooth interactions
- ✅ Immediate visual feedback
- ✅ Products update within 1 second
- ✅ No console errors
- ✅ URL stays in sync
- ✅ Mobile works flawlessly
- ✅ Filter counts are accurate
- ✅ "Clear All" resets everything

## Report Issues

If any test fails, note:
1. Which test failed
2. Console error messages (if any)
3. Network request details
4. Expected vs actual behavior
5. Screenshots/screen recording

---

**Time to Complete**: ~15-20 minutes for full test suite
**Critical Tests**: Brand, Category, Price Range, Mobile Drawer, Clear All
