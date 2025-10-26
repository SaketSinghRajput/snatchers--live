import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
  priority = false,
  quality = 80,
  placeholder = 'blur',
  blurDataURL,
  sizes,
  onLoad,
  onError,
  enableWebP = true,
  enableAvif = true,
  adaptiveQuality = true,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState('');
  const [networkInfo, setNetworkInfo] = useState(null);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Get network information for adaptive loading
  useEffect(() => {
    if ('connection' in navigator) {
      setNetworkInfo(navigator.connection);
      
      const handleConnectionChange = () => {
        setNetworkInfo(navigator.connection);
      };
      
      navigator.connection.addEventListener('change', handleConnectionChange);
      return () => {
        navigator.connection.removeEventListener('change', handleConnectionChange);
      };
    }
  }, []);

  // Get adaptive quality based on network conditions
  const getAdaptiveQuality = useCallback(() => {
    if (!adaptiveQuality || !networkInfo) return quality;
    
    const { effectiveType, saveData } = networkInfo;
    
    if (saveData) return Math.min(quality, 40);
    
    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        return Math.min(quality, 30);
      case '3g':
        return Math.min(quality, 60);
      case '4g':
        return quality;
      default:
        return quality;
    }
  }, [quality, networkInfo, adaptiveQuality]);

  // Generate optimized image URLs
  const generateOptimizedSrc = useCallback((originalSrc, width, quality = 80) => {
    if (!originalSrc) return '';
    
    // If it's already an external URL, return as is
    if (originalSrc.startsWith('http')) {
      return originalSrc;
    }
    
    // For local images, we can add query parameters for optimization
    // This would work with a backend image optimization service
    const params = new URLSearchParams();
    if (width) params.append('w', width.toString());
    
    const adaptiveQuality = getAdaptiveQuality();
    if (adaptiveQuality !== 80) params.append('q', adaptiveQuality.toString());
    
    const queryString = params.toString();
    return queryString ? `${originalSrc}?${queryString}` : originalSrc;
  }, [getAdaptiveQuality]);

  // Generate AVIF source if supported
  const generateAvifSrc = useCallback((originalSrc, width) => {
    if (!enableAvif || !originalSrc || originalSrc.startsWith('http')) return null;
    
    const params = new URLSearchParams();
    if (width) params.append('w', width.toString());
    
    const adaptiveQuality = getAdaptiveQuality();
    if (adaptiveQuality !== 80) params.append('q', adaptiveQuality.toString());
    params.append('f', 'avif');
    
    return `${originalSrc}?${params.toString()}`;
  }, [enableAvif, getAdaptiveQuality]);

  // Generate WebP source if supported
  const generateWebPSrc = useCallback((originalSrc, width) => {
    if (!enableWebP || !originalSrc || originalSrc.startsWith('http')) return null;
    
    const params = new URLSearchParams();
    if (width) params.append('w', width.toString());
    
    const adaptiveQuality = getAdaptiveQuality();
    if (adaptiveQuality !== 80) params.append('q', adaptiveQuality.toString());
    params.append('f', 'webp');
    
    return `${originalSrc}?${params.toString()}`;
  }, [enableWebP, getAdaptiveQuality]);

  // Generate srcSet for responsive images
  const generateSrcSet = useCallback((originalSrc, format = null) => {
    if (!originalSrc || originalSrc.startsWith('http')) return '';
    
    const widths = [320, 640, 768, 1024, 1280, 1920];
    const adaptiveQuality = getAdaptiveQuality();
    
    return widths
      .map(w => {
        const params = new URLSearchParams();
        params.append('w', w.toString());
        if (adaptiveQuality !== 80) params.append('q', adaptiveQuality.toString());
        if (format) params.append('f', format);
        
        const queryString = params.toString();
        const src = queryString ? `${originalSrc}?${queryString}` : originalSrc;
        return `${src} ${w}w`;
      })
      .join(', ');
  }, [getAdaptiveQuality]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!imgRef.current || priority || loading !== 'lazy') {
      setCurrentSrc(generateOptimizedSrc(src, width));
      return;
    }

    // Adjust root margin based on network speed
    const rootMargin = networkInfo?.effectiveType === 'slow-2g' || networkInfo?.effectiveType === '2g' 
      ? '20px' 
      : '50px';

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setCurrentSrc(generateOptimizedSrc(src, width));
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin,
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [src, width, priority, loading, generateOptimizedSrc, networkInfo]);

  // Handle image load
  const handleLoad = (event) => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.(event);
  };

  // Handle image error
  const handleError = (event) => {
    setHasError(true);
    setIsLoaded(false);
    onError?.(event);
  };

  // Generate placeholder styles
  const getPlaceholderStyles = () => {
    if (placeholder === 'blur' && !isLoaded && !hasError) {
      return {
        filter: 'blur(10px)',
        transition: 'filter 0.3s ease',
        backgroundColor: '#f3f4f6'
      };
    }
    return {};
  };

  // Generate container styles for aspect ratio
  const getContainerStyles = () => {
    if (width && height) {
      return {
        aspectRatio: `${width} / ${height}`,
        width: '100%',
        height: 'auto'
      };
    }
    return {};
  };

  const avifSrc = generateAvifSrc(src, width);
  const webpSrc = generateWebPSrc(src, width);
  const avifSrcSet = generateSrcSet(src, 'avif');
  const webpSrcSet = generateSrcSet(src, 'webp');
  const fallbackSrcSet = generateSrcSet(src);

  return (
    <div 
      className={`optimized-image-container ${className}`}
      style={getContainerStyles()}
    >
      {hasError ? (
        <div 
          className="image-error-placeholder bg-gray-200 flex items-center justify-center text-gray-500"
          style={{ width: width || '100%', height: height || 'auto' }}
        >
          <span>Image not available</span>
        </div>
      ) : (
        <picture>
          {/* AVIF source for modern browsers */}
          {avifSrc && (
            <source
              srcSet={avifSrcSet || avifSrc}
              type="image/avif"
              sizes={sizes}
            />
          )}
          
          {/* WebP source for modern browsers */}
          {webpSrc && (
            <source
              srcSet={webpSrcSet || webpSrc}
              type="image/webp"
              sizes={sizes}
            />
          )}
          
          {/* Fallback image */}
          <img
            ref={imgRef}
            src={currentSrc || (priority ? generateOptimizedSrc(src, width) : '')}
            srcSet={fallbackSrcSet}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? 'eager' : loading}
            decoding="async"
            onLoad={handleLoad}
            onError={handleError}
            sizes={sizes}
            style={{
              ...getPlaceholderStyles(),
              width: '100%',
              height: 'auto',
              objectFit: 'cover'
            }}
            {...props}
          />
        </picture>
      )}
      
      {/* Loading placeholder */}
      {!isLoaded && !hasError && placeholder === 'blur' && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{
            backgroundImage: blurDataURL ? `url(${blurDataURL})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )}
    </div>
  );
};

OptimizedImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  width: PropTypes.number,
  height: PropTypes.number,
  className: PropTypes.string,
  loading: PropTypes.oneOf(['lazy', 'eager']),
  priority: PropTypes.bool,
  quality: PropTypes.number,
  placeholder: PropTypes.oneOf(['blur', 'empty']),
  blurDataURL: PropTypes.string,
  sizes: PropTypes.string,
  onLoad: PropTypes.func,
  onError: PropTypes.func,
  enableWebP: PropTypes.bool,
  enableAvif: PropTypes.bool,
  adaptiveQuality: PropTypes.bool
};

export default OptimizedImage;