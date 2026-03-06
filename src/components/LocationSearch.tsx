import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, MapPin, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { searchPlaces, SearchResult, formatSearchResult, getPlaceTypeIcon, getCoordinatesFromResult } from '../lib/geocoding';

interface LocationSearchProps {
  onLocationSelect: (coordinates: [number, number], address: string) => void;
  placeholder?: string;
  className?: string;
}

interface SearchState {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  isOpen: boolean;
  selectedIndex: number;
  isInteracting: boolean; // Track when user is actively interacting with dropdown
}

const LocationSearch: React.FC<LocationSearchProps> = ({
  onLocationSelect,
  placeholder = 'Search for places...',
  className = '',
}) => {
  const [state, setState] = useState<SearchState>({
    query: '',
    results: [],
    isLoading: false,
    isOpen: false,
    selectedIndex: -1,
    isInteracting: false,
  });

  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setState(prev => ({ ...prev, results: [], isLoading: false }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const results = await searchPlaces(query, 8);
      setState(prev => ({
        ...prev,
        results,
        isLoading: false,
        selectedIndex: results.length > 0 ? 0 : -1,
      }));
    } catch (error) {
      console.error('Search failed:', error);
      setState(prev => ({ ...prev, results: [], isLoading: false }));
    }
  }, []);

  // Handle input change with debouncing
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setState(prev => ({ ...prev, query, isOpen: true }));

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  }, [performSearch]);

  // Handle result selection
  const handleResultSelect = useCallback((result: SearchResult) => {
    const coordinates = getCoordinatesFromResult(result);
    const address = formatSearchResult(result);

    setState(prev => ({
      ...prev,
      query: address,
      isOpen: false,
      results: [],
    }));

    onLocationSelect(coordinates, address);
  }, [onLocationSelect]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!state.isOpen || state.results.length === 0) {
      return;
    }

    switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setState(prev => ({
        ...prev,
        selectedIndex: prev.selectedIndex < prev.results.length - 1
          ? prev.selectedIndex + 1
          : 0,
      }));
      break;

    case 'ArrowUp':
      e.preventDefault();
      setState(prev => ({
        ...prev,
        selectedIndex: prev.selectedIndex > 0
          ? prev.selectedIndex - 1
          : prev.results.length - 1,
      }));
      break;

    case 'Enter':
      e.preventDefault();
      if (state.selectedIndex >= 0 && state.selectedIndex < state.results.length) {
        handleResultSelect(state.results[state.selectedIndex]);
      }
      break;

    case 'Escape':
      e.preventDefault();
      setState(prev => ({ ...prev, isOpen: false, selectedIndex: -1 }));
      break;
    }
  }, [state.isOpen, state.results, state.selectedIndex, handleResultSelect]);

  // Update dropdown position when opening
  const updateDropdownPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: Math.max(16, Math.min(rect.left + window.scrollX, window.innerWidth - 336)),
      });
    }
  }, []);

  // Handle input focus
  const handleFocus = useCallback(() => {
    updateDropdownPosition();
    setState(prev => ({ ...prev, isOpen: true }));
  }, [updateDropdownPosition]);

  // Handle input focus with better UX
  const handleFocusEnhanced = useCallback(() => {
    updateDropdownPosition();
    setState(prev => ({
      ...prev,
      isOpen: true,
      // Reset selected index when focusing
      selectedIndex: prev.results.length > 0 ? 0 : -1,
      isInteracting: false, // Reset interaction state on focus
    }));
  }, [updateDropdownPosition]);

  // Handle dropdown mouse enter (user is interacting)
  const handleDropdownMouseEnter = useCallback(() => {
    setState(prev => ({ ...prev, isInteracting: true }));
  }, []);

  // Handle dropdown mouse leave (user stopped interacting)
  const handleDropdownMouseLeave = useCallback(() => {
    setState(prev => ({ ...prev, isInteracting: false }));
  }, []);

  // Handle input blur with delay to allow result clicks
  const handleBlur = useCallback(() => {
    // Don't close immediately if we're still loading or have results
    setTimeout(() => {
      setState(prev => {
        // Don't close if we're still loading, have results, or user is actively interacting
        if (prev.isLoading || prev.isInteracting || (prev.results.length > 0 && prev.query.length >= 2)) {
          return prev;
        }
        return { ...prev, isOpen: false, selectedIndex: -1 };
      });
    }, 300); // Increased from 150ms to 300ms
  }, []);

  // Clear search
  const handleClear = useCallback(() => {
    setState({
      query: '',
      results: [],
      isLoading: false,
      isOpen: false,
      selectedIndex: -1,
      isInteracting: false,
    });
    inputRef.current?.focus();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if we're still loading, have results, or user is actively interacting
      setState(prev => {
        if (prev.isLoading || prev.isInteracting || (prev.results.length > 0 && prev.query.length >= 2)) {
          // Only close if click is definitely outside both input and dropdown
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
              inputRef.current && !inputRef.current.contains(event.target as Node)) {
            return { ...prev, isOpen: false, selectedIndex: -1 };
          }
          return prev;
        }
        // Normal behavior for empty states
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
            inputRef.current && !inputRef.current.contains(event.target as Node)) {
          return { ...prev, isOpen: false, selectedIndex: -1 };
        }
        return prev;
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Modern Search Input Container - Google-style wide search bar */}
      <div className="relative group w-full min-w-80">
        {/* Google-style clean background */}
        <div className="absolute inset-0 bg-white rounded-2xl border border-gray-200 shadow-sm transition-all duration-200 group-hover:shadow-md"></div>

        {/* Subtle focus ring */}
        <div className="absolute inset-0 rounded-2xl ring-1 ring-blue-500/30 transition-all duration-200 opacity-0 focus-within:opacity-100 pointer-events-none"></div>

        {/* Search icon */}
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center z-20 pointer-events-none">
          <Search size={18} className="text-gray-400" />
        </div>

        {/* Main input field - Google-style wide search design */}
        <input
          ref={inputRef}
          type="text"
          value={state.query}
          onChange={handleInputChange}
          onFocus={handleFocusEnhanced}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder=""
          className="relative z-10 w-full pl-12 pr-12 py-4 bg-transparent border-0 rounded-2xl outline-none text-gray-900 text-base font-normal transition-all duration-200 placeholder-gray-500 focus:placeholder-gray-400"
          autoComplete="off"
          aria-label={placeholder}
        />

        {/* Enhanced clear button with animation */}
        <AnimatePresence>
          {state.query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.8, rotate: 90 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-4 flex items-center z-10 text-gray-400 hover:text-gray-600 transition-all duration-300 hover:scale-110"
              aria-label="Clear search"
              title="Clear search"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 hover:from-red-100 hover:to-red-200 flex items-center justify-center transition-all duration-300 shadow-sm">
                <X size={16} />
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Enhanced inner glow */}
        <div className={`absolute inset-0 rounded-2xl transition-all duration-500 ${
          state.query
            ? 'bg-gradient-to-r from-blue-50/20 via-indigo-50/15 to-purple-50/20'
            : 'bg-gradient-to-r from-gray-50/5 to-transparent'
        } pointer-events-none`}></div>
      </div>

      {/* Results Dropdown - Rendered as Portal */}
      {createPortal(
        <AnimatePresence>
          {state.isOpen && (state.results.length > 0 || state.isLoading) && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-[10000] max-h-96 overflow-hidden"
              style={{
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                width: '320px',
                maxWidth: '90vw',
                top: dropdownPosition?.top || 0,
                left: dropdownPosition?.left || 0,
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={handleDropdownMouseEnter}
              onMouseLeave={handleDropdownMouseLeave}
            >
              {/* Loading State */}
              {state.isLoading && state.results.length === 0 && (
                <div className="flex items-center justify-center py-8 px-6">
                  <div className="flex items-center space-x-3 text-gray-600">
                    <Loader2 size={20} className="animate-spin text-blue-500" />
                    <span className="text-sm font-medium">Searching places...</span>
                  </div>
                </div>
              )}

              {/* Results List */}
              {state.results.length > 0 && (
                <div className="max-h-80 overflow-y-auto">
                  {state.results.map((result, index) => (
                    <motion.button
                      key={result.place_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02, duration: 0.2 }}
                      onClick={() => handleResultSelect(result)}
                      className={`w-full px-6 py-4 text-left hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 focus:bg-gradient-to-r focus:from-blue-50 focus:to-indigo-50 focus:outline-none transition-all duration-200 border-b border-gray-100/50 last:border-b-0 group ${
                        index === state.selectedIndex
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 shadow-inner'
                          : ''
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        {/* Icon with enhanced styling */}
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-blue-100 group-hover:to-indigo-100 transition-all duration-200">
                            <span className="text-lg">
                              {getPlaceTypeIcon(result.type)}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-semibold text-gray-900 truncate group-hover:text-blue-900 transition-colors duration-200">
                            {formatSearchResult(result)}
                          </div>
                        </div>

                        {/* Location pin indicator */}
                        <div className="flex-shrink-0 mt-2">
                          <div className="w-2 h-2 rounded-full bg-gray-300 group-hover:bg-blue-400 transition-colors duration-200"></div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* No Results State */}
              {!state.isLoading && state.query.length >= 2 && state.results.length === 0 && (
                <div className="px-6 py-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <MapPin size={24} className="text-gray-400" />
                  </div>
                  <div className="text-base font-semibold text-gray-900 mb-1">No places found</div>
                  <div className="text-sm text-gray-500">Try searching for a different location</div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
};

export default LocationSearch;
