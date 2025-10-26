import React, { useState, useRef, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Thumbs, Zoom } from 'swiper/modules';
import { motion, AnimatePresence } from 'framer-motion';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/thumbs';
import 'swiper/css/zoom';

const ProductGallery = ({ 
  images = [], 
  productTitle = '', 
  badgeText = '', 
  badgeClass = 'bg-black',
  enable360View = false,
  onImageClick 
}) => {
  const [thumbsSwiper, setThumbsSwiper] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [is360Mode, setIs360Mode] = useState(false);
  const imageRef = useRef(null);

  // Handle mouse move for zoom effect
  const handleMouseMove = (e) => {
    if (!isZoomed || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setZoomPosition({ x, y });
  };

  // Handle image click for zoom toggle
  const handleImageClick = (e) => {
    e.stopPropagation();
    if (onImageClick) {
      onImageClick(images[activeIndex], activeIndex);
    } else {
      setShowFullscreen(true);
    }
  };

  // Keyboard navigation for accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showFullscreen) {
        if (e.key === 'Escape') {
          setShowFullscreen(false);
        } else if (e.key === 'ArrowLeft' && activeIndex > 0) {
          setActiveIndex(activeIndex - 1);
        } else if (e.key === 'ArrowRight' && activeIndex < images.length - 1) {
          setActiveIndex(activeIndex + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFullscreen, activeIndex, images.length]);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
        <span className="text-gray-500">No images available</span>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Badge */}
      {badgeText && (
        <div
          className={`absolute z-20 top-4 left-4 text-white italic px-3 py-1 text-xs font-serif ${badgeClass} shadow-lg`}
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'upright',
            WebkitWritingMode: 'vertical-rl',
            WebkitTextOrientation: 'upright',
            clipPath: "polygon(100% 0%, 85% 50%, 100% 100%, 0 100%, 0% 50%, 0 0)",
            fontFamily: "'Droid Serif', serif",
            lineHeight: 1,
            whiteSpace: 'nowrap'
          }}
        >
          {badgeText.toUpperCase()}
        </div>
      )}

      {/* 360 View Toggle */}
      {enable360View && (
        <button
          onClick={() => setIs360Mode(!is360Mode)}
          className="absolute z-20 top-4 right-16 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white transition-all duration-200"
          aria-label="Toggle 360° view"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}

      {/* Fullscreen Toggle */}
      <button
        onClick={() => setShowFullscreen(true)}
        className="absolute z-20 top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white transition-all duration-200"
        aria-label="View fullscreen"
      >
        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>

      {/* Main Image Gallery */}
      <div className="relative mb-4">
        <Swiper
          style={{ 
            width: "100%", 
            height: "500px",
            '--swiper-navigation-color': '#000',
            '--swiper-navigation-size': '24px'
          }}
          spaceBetween={0}
          navigation={{
            nextEl: '.gallery-button-next',
            prevEl: '.gallery-button-prev',
          }}
          thumbs={{ 
            swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null 
          }}
          zoom={true}
          modules={[Thumbs, Navigation, Zoom]}
          onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
          className="rounded-lg overflow-hidden"
        >
          {images.map((img, idx) => (
            <SwiperSlide key={idx}>
              <div 
                className="swiper-zoom-container relative w-full h-full bg-gray-100 cursor-zoom-in"
                onMouseEnter={() => setIsZoomed(true)}
                onMouseLeave={() => setIsZoomed(false)}
                onMouseMove={handleMouseMove}
                onClick={handleImageClick}
              >
                <img
                  ref={idx === activeIndex ? imageRef : null}
                  src={img}
                  alt={`${productTitle} - Image ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300"
                  style={isZoomed && idx === activeIndex ? {
                    transform: 'scale(2)',
                    transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`
                  } : {}}
                />
                
                {/* Zoom indicator */}
                {idx === activeIndex && (
                  <div className="absolute bottom-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs">
                    Click to zoom
                  </div>
                )}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Custom Navigation Buttons */}
        <div className="gallery-button-prev absolute left-4 top-1/2 transform -translate-y-1/2 z-10 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer">
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </div>
        <div className="gallery-button-next absolute right-4 top-1/2 transform -translate-y-1/2 z-10 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer">
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Thumbnail Gallery */}
      <div className="px-2">
        <Swiper
          onSwiper={setThumbsSwiper}
          spaceBetween={12}
          slidesPerView={4}
          breakpoints={{
            640: { slidesPerView: 5 },
            768: { slidesPerView: 6 },
            1024: { slidesPerView: 4 }
          }}
          freeMode
          watchSlidesProgress
          modules={[Thumbs]}
          className="thumbnail-swiper"
        >
          {images.map((img, idx) => (
            <SwiperSlide key={idx}>
              <div 
                className={`relative group cursor-pointer ${
                  idx === activeIndex ? 'ring-2 ring-red-500' : ''
                }`}
                onClick={() => setActiveIndex(idx)}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-20 object-cover rounded-lg border-2 border-gray-200 group-hover:border-red-300 transition-all duration-200 shadow-sm"
                />
                {idx === activeIndex && (
                  <div className="absolute inset-0 bg-red-500/20 rounded-lg"></div>
                )}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {showFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setShowFullscreen(false)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative max-w-4xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowFullscreen(false)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
                aria-label="Close fullscreen"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Fullscreen image */}
              <img
                src={images[activeIndex]}
                alt={`${productTitle} - Fullscreen`}
                className="max-w-full max-h-full object-contain rounded-lg"
              />

              {/* Navigation in fullscreen */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
                    disabled={activeIndex === 0}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setActiveIndex(Math.min(images.length - 1, activeIndex + 1))}
                    disabled={activeIndex === images.length - 1}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}

              {/* Image counter */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {activeIndex + 1} / {images.length}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductGallery;