import { useState, useEffect, useMemo } from 'react';

const useProductVariants = (product, initialSelections = {}) => {
  const [selectedVariants, setSelectedVariants] = useState(initialSelections);
  const [isValidSelection, setIsValidSelection] = useState(true);

  // Extract variants from product
  const variants = useMemo(() => {
    if (!product?.variants) return [];
    
    return product.variants.map(variant => ({
      ...variant,
      type: variant.type || inferVariantType(variant.name),
      required: variant.required !== false, // Default to required unless explicitly set to false
      stockStatus: variant.stockStatus || {},
      colorValues: variant.colorValues || {},
      sizeGuide: variant.sizeGuide
    }));
  }, [product]);

  // Infer variant type from name
  const inferVariantType = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('color') || lowerName.includes('colour')) return 'color';
    if (lowerName.includes('size')) return 'size';
    if (lowerName.includes('material') || lowerName.includes('fabric')) return 'text';
    return 'text';
  };

  // Calculate price with variant modifiers
  const calculatePrice = useMemo(() => {
    if (!product) return { price: 0, offerPrice: 0 };
    
    let basePrice = product.price;
    let baseOfferPrice = product.offerPrice || product.price;
    
    // Apply variant price modifiers
    variants.forEach(variant => {
      const selectedOption = selectedVariants[variant.name];
      if (selectedOption && variant.priceModifier) {
        const modifier = variant.priceModifier[selectedOption] || 0;
        basePrice += modifier;
        baseOfferPrice += modifier;
      }
    });
    
    return {
      price: Math.max(0, basePrice),
      offerPrice: product.offerPrice ? Math.max(0, baseOfferPrice) : null
    };
  }, [product, selectedVariants, variants]);

  // Check if current selection is valid (all required variants selected)
  useEffect(() => {
    const requiredVariants = variants.filter(v => v.required);
    const isValid = requiredVariants.every(variant => 
      selectedVariants[variant.name] && 
      variant.options.includes(selectedVariants[variant.name])
    );
    setIsValidSelection(isValid);
  }, [selectedVariants, variants]);

  // Check stock availability for current selection
  const stockStatus = useMemo(() => {
    // If no variants are selected, use product-level stock
    if (Object.keys(selectedVariants).length === 0) {
      return product?.status === 'out_of_stock' ? 'out_of_stock' : 'in_stock';
    }

    // Check variant-specific stock
    for (const variant of variants) {
      const selectedOption = selectedVariants[variant.name];
      if (selectedOption && variant.stockStatus) {
        const optionStock = variant.stockStatus[selectedOption];
        if (optionStock === 'out_of_stock') {
          return 'out_of_stock';
        }
      }
    }

    return 'in_stock';
  }, [selectedVariants, variants, product]);

  // Get available options for a variant (considering other selections)
  const getAvailableOptions = (variantName) => {
    const variant = variants.find(v => v.name === variantName);
    if (!variant) return [];

    // For now, return all options. In a more complex system,
    // you might filter based on other variant selections
    return variant.options.filter(option => {
      const optionStock = variant.stockStatus?.[option];
      return optionStock !== 'out_of_stock';
    });
  };

  // Update variant selection
  const updateVariant = (variantName, option) => {
    setSelectedVariants(prev => ({
      ...prev,
      [variantName]: option
    }));
  };

  // Clear variant selection
  const clearVariant = (variantName) => {
    setSelectedVariants(prev => {
      const newSelections = { ...prev };
      delete newSelections[variantName];
      return newSelections;
    });
  };

  // Clear all selections
  const clearAllVariants = () => {
    setSelectedVariants({});
  };

  // Get variant selection summary
  const getSelectionSummary = () => {
    return Object.entries(selectedVariants).map(([variantName, option]) => ({
      variantName,
      option,
      variant: variants.find(v => v.name === variantName)
    }));
  };

  // Generate SKU based on selections
  const generateVariantSKU = () => {
    if (!product?.sku) return null;
    
    const variantCodes = Object.entries(selectedVariants)
      .map(([variantName, option]) => {
        const variant = variants.find(v => v.name === variantName);
        if (variant?.type === 'color') {
          return option.substring(0, 2).toUpperCase();
        }
        if (variant?.type === 'size') {
          return option.toUpperCase();
        }
        return option.substring(0, 3).toUpperCase();
      })
      .join('-');
    
    return variantCodes ? `${product.sku}-${variantCodes}` : product.sku;
  };

  return {
    variants,
    selectedVariants,
    isValidSelection,
    stockStatus,
    calculatedPrice: calculatePrice,
    updateVariant,
    clearVariant,
    clearAllVariants,
    getAvailableOptions,
    getSelectionSummary,
    generateVariantSKU,
    hasVariants: variants.length > 0,
    isOutOfStock: stockStatus === 'out_of_stock'
  };
};

export default useProductVariants;