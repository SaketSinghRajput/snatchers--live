// Mobile-optimized animation utilities

import { useEffect, useState } from 'react';

// Check if user prefers reduced motion
export const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Check if device has limited resources
export const isLowEndDevice = () => {
  const hardwareConcurrency = navigator.hardwareConcurrency || 1;
  const memory = navigator.deviceMemory || 1;
  const connection = navigator.connection;
  
  return (
    hardwareConcurrency < 4 ||
    memory < 2 ||
    (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g'))
  );
};

// Get optimal animation settings based on device capabilities
export const getAnimationSettings = () => {
  const reducedMotion = prefersReducedMotion();
  const lowEnd = isLowEndDevice();
  const isMobile = window.innerWidth < 768;
  
  if (reducedMotion) {
    return {
      duration: 0,
      enabled: false,
      useTransform: false,
      useOpacity: true
    };
  }
  
  if (lowEnd) {
    return {
      duration: 0.2,
      enabled: true,
      useTransform: false, // Avoid transforms on low-end devices
      useOpacity: true,
      easing: 'ease-out'
    };
  }
  
  if (isMobile) {
    return {
      duration: 0.3,
      enabled: true,
      useTransform: true,
      useOpacity: true,
      easing: 'ease-out'
    };
  }
  
  return {
    duration: 0.4,
    enabled: true,
    useTransform: true,
    useOpacity: true,
    easing: 'ease-in-out'
  };
};

// Framer Motion variants optimized for mobile
export const mobileVariants = {
  // Fade animations (GPU-friendly)
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: getAnimationSettings().duration }
  },
  
  // Slide animations (optimized for mobile)
  slideUp: {
    initial: { 
      opacity: 0, 
      y: getAnimationSettings().useTransform ? 20 : 0 
    },
    animate: { 
      opacity: 1, 
      y: 0 
    },
    exit: { 
      opacity: 0, 
      y: getAnimationSettings().useTransform ? -20 : 0 
    },
    transition: { 
      duration: getAnimationSettings().duration,
      ease: getAnimationSettings().easing
    }
  },
  
  slideDown: {
    initial: { 
      opacity: 0, 
      y: getAnimationSettings().useTransform ? -20 : 0 
    },
    animate: { 
      opacity: 1, 
      y: 0 
    },
    exit: { 
      opacity: 0, 
      y: getAnimationSettings().useTransform ? 20 : 0 
    },
    transition: { 
      duration: getAnimationSettings().duration,
      ease: getAnimationSettings().easing
    }
  },
  
  slideLeft: {
    initial: { 
      opacity: 0, 
      x: getAnimationSettings().useTransform ? 20 : 0 
    },
    animate: { 
      opacity: 1, 
      x: 0 
    },
    exit: { 
      opacity: 0, 
      x: getAnimationSettings().useTransform ? -20 : 0 
    },
    transition: { 
      duration: getAnimationSettings().duration,
      ease: getAnimationSettings().easing
    }
  },
  
  slideRight: {
    initial: { 
      opacity: 0, 
      x: getAnimationSettings().useTransform ? -20 : 0 
    },
    animate: { 
      opacity: 1, 
      x: 0 
    },
    exit: { 
      opacity: 0, 
      x: getAnimationSettings().useTransform ? 20 : 0 
    },
    transition: { 
      duration: getAnimationSettings().duration,
      ease: getAnimationSettings().easing
    }
  },
  
  // Scale animations (use sparingly on mobile)
  scaleIn: {
    initial: { 
      opacity: 0, 
      scale: getAnimationSettings().useTransform ? 0.9 : 1 
    },
    animate: { 
      opacity: 1, 
      scale: 1 
    },
    exit: { 
      opacity: 0, 
      scale: getAnimationSettings().useTransform ? 0.9 : 1 
    },
    transition: { 
      duration: getAnimationSettings().duration,
      ease: getAnimationSettings().easing
    }
  },
  
  // Stagger animations for lists
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: isLowEndDevice() ? 0.02 : 0.05
      }
    }
  },
  
  staggerItem: {
    initial: { opacity: 0, y: getAnimationSettings().useTransform ? 10 : 0 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: getAnimationSettings().duration }
  }
};

// CSS-based animations for better performance
export const cssAnimations = {
  fadeIn: `
    @keyframes mobileFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .mobile-fade-in {
      animation: mobileFadeIn ${getAnimationSettings().duration}s ${getAnimationSettings().easing};
    }
  `,
  
  slideUp: `
    @keyframes mobileSlideUp {
      from { 
        opacity: 0; 
        transform: ${getAnimationSettings().useTransform ? 'translateY(20px)' : 'none'}; 
      }
      to { 
        opacity: 1; 
        transform: translateY(0); 
      }
    }
    .mobile-slide-up {
      animation: mobileSlideUp ${getAnimationSettings().duration}s ${getAnimationSettings().easing};
    }
  `,
  
  pulse: `
    @keyframes mobilePulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    .mobile-pulse {
      animation: mobilePulse 2s infinite;
    }
  `
};

// Hook for managing mobile animations
export const useMobileAnimation = () => {
  const [settings, setSettings] = useState(getAnimationSettings());
  
  useEffect(() => {
    const updateSettings = () => {
      setSettings(getAnimationSettings());
    };
    
    // Listen for changes in motion preferences
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', updateSettings);
    
    // Listen for network changes
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', updateSettings);
    }
    
    return () => {
      mediaQuery.removeEventListener('change', updateSettings);
      if ('connection' in navigator) {
        navigator.connection.removeEventListener('change', updateSettings);
      }
    };
  }, []);
  
  return {
    ...settings,
    variants: mobileVariants,
    shouldAnimate: (priority = 'normal') => {
      if (!settings.enabled) return false;
      if (priority === 'low' && isLowEndDevice()) return false;
      return true;
    },
    getTransition: (customDuration) => ({
      duration: customDuration || settings.duration,
      ease: settings.easing
    })
  };
};

// Performance-aware animation component wrapper
export const MobileAnimationWrapper = ({ 
  children, 
  animation = 'fadeIn', 
  priority = 'normal',
  fallback = null 
}) => {
  const { shouldAnimate, variants } = useMobileAnimation();
  
  if (!shouldAnimate(priority)) {
    return fallback || children;
  }
  
  const variant = variants[animation] || variants.fadeIn;
  
  return (
    <motion.div
      initial={variant.initial}
      animate={variant.animate}
      exit={variant.exit}
      transition={variant.transition}
    >
      {children}
    </motion.div>
  );
};

// Intersection Observer based animation trigger
export const useInViewAnimation = (options = {}) => {
  const [isInView, setIsInView] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const { shouldAnimate } = useMobileAnimation();
  
  const ref = useRef(null);
  
  useEffect(() => {
    if (!shouldAnimate() || !ref.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setIsInView(true);
          setHasAnimated(true);
          if (options.once !== false) {
            observer.disconnect();
          }
        } else if (!entry.isIntersecting && options.once === false) {
          setIsInView(false);
        }
      },
      {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || '0px'
      }
    );
    
    observer.observe(ref.current);
    
    return () => observer.disconnect();
  }, [shouldAnimate, hasAnimated, options.once, options.threshold, options.rootMargin]);
  
  return [ref, isInView];
};

// Touch-friendly animation utilities
export const touchAnimations = {
  // Tap animation for buttons
  tap: {
    scale: isLowEndDevice() ? 1 : 0.98,
    transition: { duration: 0.1 }
  },
  
  // Hover animation (for devices that support it)
  hover: {
    scale: isLowEndDevice() ? 1 : 1.02,
    transition: { duration: 0.2 }
  },
  
  // Swipe animations
  swipeLeft: {
    x: -100,
    opacity: 0,
    transition: { duration: 0.3 }
  },
  
  swipeRight: {
    x: 100,
    opacity: 0,
    transition: { duration: 0.3 }
  }
};

// Utility to create responsive animation values
export const responsiveAnimation = (mobile, tablet, desktop) => {
  const width = window.innerWidth;
  if (width < 768) return mobile;
  if (width < 1024) return tablet;
  return desktop;
};

export default {
  mobileVariants,
  cssAnimations,
  useMobileAnimation,
  MobileAnimationWrapper,
  useInViewAnimation,
  touchAnimations,
  responsiveAnimation,
  getAnimationSettings,
  prefersReducedMotion,
  isLowEndDevice
};