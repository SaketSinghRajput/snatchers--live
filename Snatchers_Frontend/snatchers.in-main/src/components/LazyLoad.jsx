import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

const LazyLoad = ({
  children,
  height = 200,
  offset = 100,
  placeholder = null,
  onLoad = null,
  className = '',
  once = true,
  overflow = false
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const elementRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Create intersection observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            
            if (once && observerRef.current) {
              observerRef.current.unobserve(element);
            }
          } else if (!once) {
            setIsInView(false);
          }
        });
      },
      {
        rootMargin: `${offset}px`,
        threshold: 0.1
      }
    );

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [offset, once]);

  useEffect(() => {
    if (isInView && !isLoaded) {
      setIsLoaded(true);
      if (onLoad) {
        onLoad();
      }
    }
  }, [isInView, isLoaded, onLoad]);

  const containerStyle = {
    minHeight: typeof height === 'number' ? `${height}px` : height,
    overflow: overflow ? 'visible' : 'hidden'
  };

  return (
    <div 
      ref={elementRef} 
      className={`lazy-load-container ${className}`}
      style={containerStyle}
    >
      {isLoaded ? (
        children
      ) : (
        placeholder || (
          <div 
            className="lazy-load-placeholder bg-gray-200 animate-pulse flex items-center justify-center"
            style={{ height: '100%', minHeight: containerStyle.minHeight }}
          >
            <div className="text-gray-400 text-sm">Loading...</div>
          </div>
        )
      )}
    </div>
  );
};

LazyLoad.propTypes = {
  children: PropTypes.node.isRequired,
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  offset: PropTypes.number,
  placeholder: PropTypes.node,
  onLoad: PropTypes.func,
  className: PropTypes.string,
  once: PropTypes.bool,
  overflow: PropTypes.bool
};

export default LazyLoad;