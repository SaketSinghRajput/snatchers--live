import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import useMobileViewport from '../../hooks/useMobileViewport';

const MobileOptimizedImage = ({
  src,
  alt,
  className = '',
  width,
  height,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  priority = false,
  placeholder = 'blur',
  blurDataURL,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);
  const { isMobile, isRetina, networkInfo } = useMobileViewport();

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!imgRef.current || priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [priority]);

  // Generate optimized image URLs based on device capabilities
  const getOptimizedSrc = (originalSrc) => {
    if (!originalSrc) return '';

    // Check if it's already an optimized URL or external URL
    if (originalSrc.includes('?') || originalSrc.startsWith('http')) {
      return originalSrc;
    }

    const params = new URLSearchParams();
    
    // Set quality based on network conditions
    if (networkInfo?.effectiveType === 'slow-2g' || networkInfo?.effectiveType === '2g') {
      params.set('q', '60');
    } else if (networkInfo?.effectiveType === '3g') {
      params.set('q', '75');
    } else {
      params.set('q', '85');
    }

    // Set format preference
    if (supportsWebP()) {
      params.set('f', 'webp');
    } else if (supportsAVIF()) {
      params.set('f', 'avif');
    }

    // Set dimensions for mobile optimization
    if (isMobile) {
      const maxWidth = Math.min(window.innerWidth * (isRetina ? 2 : 1), 800);
      params.set('w', maxWidth.toString());
    }

    // Enable progressive loading
    params.set('progressive', 'true');

    return `${originalSrc}?${params.toString()}`;
  };

  // Check WebP support
  const supportsWebP = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  };

  // Check AVIF support
  const supportsAVIF = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
  };

  // Generate srcSet for responsive images
  const generateSrcSet = (originalSrc) => {
    if (!originalSrc) return '';

    const breakpoints = [320, 640, 768, 1024, 1280, 1536];
    const srcSet = breakpoints.map(bp => {
      const params = new URLSearchParams();
      params.set('w', bp.toString());
      params.set('q', '85');
      
      if (supportsWebP()) {
        params.set('f', 'webp');
      }
      
      return `${originalSrc}?${params.toString()} ${bp}w`;
    });

    return srcSet.join(', ');
  };

  const handleLoad = (e) => {
    setIsLoaded(true);
    if (onLoad) onLoad(e);
  };

  const handleError = (e) => {
    setHasError(true);
    if (onError) onError(e);
  };

  // Generate blur placeholder
  const generateBlurDataURL = () => {
    if (blurDataURL) return blurDataURL;
    
    // Generate a simple blur placeholder
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, 10, 10);
    return canvas.toDataURL();
  };

  const shouldLoad = priority || isInView;
  const optimizedSrc = shouldLoad ? getOptimizedSrc(src) : '';
  const srcSet = shouldLoad ? generateSrcSet(src) : '';

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Blur placeholder */}
      {placeholder === 'blur' && !isLoaded && (
        <div
          className="absolute inset-0 bg-gray-200"
          style={{
            backgroundImage: `url(${generateBlurDataURL()})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(10px)',
            transform: 'scale(1.1)'
          }}
        />
      )}

      {/* Loading skeleton */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 mobile-skeleton" />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs">Image not available</p>
          </div>
        </div>
      )}

      {/* Main image */}
      {shouldLoad && !hasError && (
        <motion.img
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          src={optimizedSrc}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          width={width}
          height={height}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...props}
        />
      )}

      {/* Loading indicator */}
      {shouldLoad && !isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-red-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default MobileOptimizedImage;