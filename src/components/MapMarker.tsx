import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Heart, MessageCircle, Clock } from 'lucide-react';

import type { Vibe } from '../types';

interface MapMarkerProps {
  vibe: Vibe;
  style?: React.CSSProperties;
  onClick?: () => void;
  onVote?: (vibeId: number) => void;
}

const vibeColors: Record<string, { bg: string; text: string; border: string }> = {
  safe: { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-500' },
  calm: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-500' },
  lively: { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-500' },
  festive: { bg: 'bg-violet-500', text: 'text-violet-600', border: 'border-violet-500' },
  crowded: { bg: 'bg-red-500', text: 'text-red-600', border: 'border-red-500' },
  suspicious: { bg: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-500' },
  dangerous: { bg: 'bg-red-600', text: 'text-red-600', border: 'border-red-600' },
  noisy: { bg: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-500' },
  quiet: { bg: 'bg-cyan-500', text: 'text-cyan-600', border: 'border-cyan-500' },
};

export function MapMarker({ vibe, style, onClick, onVote }: MapMarkerProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isVoted, setIsVoted] = useState(false);
  const vibeColor = vibeColors[vibe.vibe_type] || vibeColors.safe;

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) {
      return 'Just now';
    }
    if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ago`;
    }
    if (seconds < 86400) {
      return `${Math.floor(seconds / 3600)}h ago`;
    }
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const handleVote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVoted(!isVoted);
    onVote?.(vibe.id);
  };

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement comment functionality
    console.log('Comment clicked');
  };

  return (
    <div style={style} className="relative">
      {/* Animated Marker Pin */}
      <motion.div
        initial={{ scale: 0, y: -20 }}
        animate={{ scale: 1, y: 0 }}
        whileHover={{ scale: 1.1 }}
        className="cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        {/* Pulsing background circle */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
          className={`absolute w-4 h-4 rounded-full opacity-30 ${vibeColor.bg} top-0 left-1/2 -translate-x-1/2`}
        />

        {/* Main marker */}
        <div className={`relative w-10 h-10 ${vibeColor.bg} rounded-full shadow-lg flex items-center justify-center border-4 border-white hover:shadow-xl transition-shadow duration-200`}>
          <MapPin className="w-5 h-5 text-white" fill="currentColor" />
        </div>

        {/* Marker pointer */}
        <div className={`w-0 h-0 border-l-4 border-r-4 border-t-8 ${vibeColor.bg} border-l-transparent border-r-transparent mx-auto`} />
      </motion.div>

      {/* Enhanced Details Card */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-4 border border-gray-200 dark:border-gray-800 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with user info */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {vibe.profile?.username?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {vibe.profile?.username || 'Anonymous'}
                </p>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {getTimeAgo(new Date(vibe.created_at))}
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${vibeColor.bg} text-white border ${vibeColor.border}`}>
                {vibe.vibe_type}
              </div>
            </div>

            {/* Content */}
            {vibe.notes && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
                {vibe.notes}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-4 pt-3 border-t border-gray-100 dark:border-gray-800">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleVote}
                className={`flex items-center gap-1 text-sm transition-colors min-h-[44px] px-2 py-1 rounded-lg ${
                  isVoted
                    ? 'text-red-500 hover:text-red-600'
                    : 'text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400'
                }`}
              >
                <Heart className={`w-4 h-4 ${isVoted ? 'fill-current' : ''}`} />
                <span>{(vibe.upvotes || 0) + (isVoted ? 1 : 0)}</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleComment}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-500 transition-colors min-h-[44px] px-2 py-1 rounded-lg dark:text-gray-400 dark:hover:text-blue-400"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Comment</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
