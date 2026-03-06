import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, Search, Building, Coffee, Car, Plane, Train, Bus, ShoppingBag, Heart, Star, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { searchPlaces, SearchResult, formatSearchResult, getPlaceTypeIcon, getCoordinatesFromResult } from '../lib/geocoding';

import Modal from './shared/Modal';
import styles from './LocationSearchModal.module.css';

interface LocationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (coordinates: [number, number], address: string) => void;
}

interface SearchState {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  selectedIndex: number;
  isFocused: boolean;
  recentSearches: string[];
}

const LocationSearchModal: React.FC<LocationSearchModalProps> = ({
  isOpen,
  onClose,
  onLocationSelect,
}) => {
  const { t } = useTranslation();
  const [state, setState] = useState<SearchState>({
    query: '',
    results: [],
    isLoading: false,
    selectedIndex: -1,
    isFocused: false,
    recentSearches: [],
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load recent searches from localStorage
  const loadRecentSearches = useCallback(() => {
    try {
      const stored = localStorage.getItem('hyperapp_recent_searches');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading recent searches:', error);
      return [];
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearches = useCallback((searches: string[]) => {
    try {
      localStorage.setItem('hyperapp_recent_searches', JSON.stringify(searches));
    } catch (error) {
      console.error('Error saving recent searches:', error);
    }
  }, []);

  // Add a search to recent searches
  const addToRecentSearches = useCallback((search: string) => {
    setState(prev => {
      const filtered = prev.recentSearches.filter(s => s !== search);
      const updated = [search, ...filtered].slice(0, 5); // Keep only 5 recent searches
      saveRecentSearches(updated);
      return { ...prev, recentSearches: updated };
    });
  }, [saveRecentSearches]);

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setState(prev => ({ ...prev, results: [], isLoading: false, recentSearches: prev.recentSearches }));
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
      setState(prev => ({ ...prev, results: [], isLoading: false, recentSearches: prev.recentSearches }));
    }
  }, []);

  // Handle input change with debouncing
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setState(prev => ({ ...prev, query }));

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

    // Add to recent searches
    addToRecentSearches(address);

    setState(prev => ({
      query: '',
      results: [],
      isLoading: false,
      selectedIndex: -1,
      isFocused: false,
      recentSearches: prev.recentSearches,
    }));

    onLocationSelect(coordinates, address);
    onClose();
  }, [onLocationSelect, onClose, addToRecentSearches]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (state.results.length === 0) {
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
      onClose();
      break;
    }
  }, [state.results, state.selectedIndex, handleResultSelect, onClose]);

  // Handle focus/blur
  const handleFocus = useCallback(() => {
    setState(prev => ({ ...prev, isFocused: true }));
  }, []);

  const handleBlur = useCallback(() => {
    setState(prev => ({ ...prev, isFocused: false }));
  }, []);

  // Clear search
  const handleClear = useCallback(() => {
    setState(prev => ({
      query: '',
      results: [],
      isLoading: false,
      selectedIndex: -1,
      isFocused: false,
      recentSearches: prev.recentSearches,
    }));
    inputRef.current?.focus();
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Load recent searches when modal opens
      const recent = loadRecentSearches();
      setState(prev => ({
        query: '',
        results: [],
        isLoading: false,
        selectedIndex: -1,
        isFocused: false,
        recentSearches: recent,
      }));
      // Focus input after modal animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  // Load recent searches on mount
  useEffect(() => {
    const recent = loadRecentSearches();
    setState(prev => ({ ...prev, recentSearches: recent }));
  }, [loadRecentSearches]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title=""
    >
      <div className={styles.locationSearchContainer}>
        <div className={styles.searchCard}>
          <div className={styles.searchHeader}>
            <h1 className={styles.searchTitle}>
              {t('modals.locationSearch.title')}
            </h1>
            <p className={styles.searchSubtitle}>{t('modals.locationSearch.subtitle')}</p>

            <div className={styles.searchInputContainer}>
              <Search size={18} className={styles.searchIcon} />
              <input
                ref={inputRef}
                type="text"
                value={state.query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={t('modals.locationSearch.placeholder')}
                className={styles.searchInput}
                autoComplete="off"
                aria-label={t('modals.locationSearch.placeholder')}
              />
            </div>
          </div>

          <div className={styles.searchResults}>
            {/* Loading State */}
            <AnimatePresence>
              {state.isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={styles.loadingContainer}
                >
                  <div className={styles.loadingIcon}>
                    <Loader2 size={28} className="animate-spin text-blue-600" />
                  </div>
                  <div className={styles.loadingText}>{t('modals.locationSearch.loadingText')}</div>
                  <div className={styles.loadingSubtext}>{t('modals.locationSearch.loadingSubtext')}</div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Default Results - Recent Searches */}
            <AnimatePresence>
              {!state.isLoading && state.query.length < 2 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Recent Searches Label */}
                  {state.recentSearches.length > 0 && (
                    <>
                      <div className={styles.recentLabel}>{t('modals.locationSearch.recentSearches')}</div>

                      {/* Recent Search Items */}
                      {state.recentSearches.map((search, index) => (
                        <motion.div
                          key={`recent-${index}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={styles.resultItem}
                          onClick={() => {
                            // Set the search query to the recent search
                            setState(prev => ({ ...prev, query: search }));
                            performSearch(search);
                          }}
                        >
                          <div className={styles.resultIcon}>
                            <i className="fas fa-clock"></i>
                          </div>
                          <div className={styles.resultContent}>
                            <div className={styles.resultTitle}>{search}</div>
                            <div className={styles.resultAddress}>{t('modals.locationSearch.recentSearch')}</div>
                          </div>
                        </motion.div>
                      ))}
                    </>
                  )}

                  {/* Popular Locations Label */}
                  <div className={styles.recentLabel}>{t('modals.locationSearch.popularLocations')}</div>

                  {/* Popular Location Items */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={styles.resultItem}
                    onClick={() => {
                      const location = "Fisherman's Wharf, San Francisco, CA";
                      setState(prev => ({ ...prev, query: location }));
                      performSearch(location);
                    }}
                  >
                    <div className={styles.resultIcon}>
                      <i className="fas fa-map-pin"></i>
                    </div>
                    <div className={styles.resultContent}>
                      <div className={styles.resultTitle}>Fisherman's Wharf</div>
                      <div className={styles.resultAddress}>San Francisco, CA</div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className={styles.resultItem}
                    onClick={() => {
                      const location = 'Mission District, San Francisco, CA';
                      setState(prev => ({ ...prev, query: location }));
                      performSearch(location);
                    }}
                  >
                    <div className={styles.resultIcon}>
                      <i className="fas fa-map-pin"></i>
                    </div>
                    <div className={styles.resultContent}>
                      <div className={styles.resultTitle}>Mission District</div>
                      <div className={styles.resultAddress}>San Francisco, CA</div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={styles.resultItem}
                    onClick={() => {
                      const location = 'Tenderloin District, San Francisco, CA';
                      setState(prev => ({ ...prev, query: location }));
                      performSearch(location);
                    }}
                  >
                    <div className={styles.resultIcon}>
                      <i className="fas fa-map-pin"></i>
                    </div>
                    <div className={styles.resultContent}>
                      <div className={styles.resultTitle}>Tenderloin District</div>
                      <div className={styles.resultAddress}>San Francisco, CA</div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search Results */}
            <AnimatePresence>
              {!state.isLoading && state.results.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Search Results Label */}
                  <div className={styles.recentLabel}>{t('modals.locationSearch.searchResults')}</div>

                  {state.results.map((result, index) => {
                    return (
                      <motion.div
                        key={result.place_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{
                          delay: index * 0.03,
                          duration: 0.2,
                          ease: 'easeOut',
                        }}
                        onClick={() => handleResultSelect(result)}
                        className={`${styles.resultItem} ${index === state.selectedIndex ? styles.selected : ''}`}
                      >
                        <div className={styles.resultIcon}>
                          <i className="fas fa-map-pin"></i>
                        </div>
                        <div className={styles.resultContent}>
                          <div className={styles.resultTitle}>
                            {formatSearchResult(result)}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* No Results State */}
            <AnimatePresence>
              {!state.isLoading && state.query.length >= 2 && state.results.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={styles.emptyState}
                >
                  <i className="fas fa-map-marked-alt"></i>
                  <p>{t('modals.locationSearch.noLocationsFound')}</p>
                  <p style={{marginTop: '8px', fontSize: '0.8rem'}}>{t('modals.locationSearch.tryDifferentLocation')}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {t('modals.locationSearch.footer')}
        </div>
      </div>
    </Modal>
  );
};

export default LocationSearchModal;
