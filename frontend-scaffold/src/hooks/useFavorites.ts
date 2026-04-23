import { useMemo, useCallback } from 'react';
import { useWalletStore } from '../store/walletStore';
import { useFavoritesStore } from '../store/favoritesStore';
import { FavoriteCreator } from '../types';

export const useFavorites = () => {
  const { publicKey } = useWalletStore();
  const { favoritesByWallet, addFavorite, removeFavorite, incrementTipCount } = useFavoritesStore();

  const favorites = useMemo(() => {
    if (!publicKey) return [];
    return favoritesByWallet[publicKey] || [];
  }, [favoritesByWallet, publicKey]);

  const isFavorite = useCallback(
    (address: string) => {
      return favorites.some((f) => f.address === address);
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    (creator: { address: string; username: string }) => {
      if (!publicKey) return;
      if (isFavorite(creator.address)) {
        removeFavorite(publicKey, creator.address);
      } else {
        addFavorite(publicKey, creator);
      }
    },
    [publicKey, isFavorite, removeFavorite, addFavorite]
  );

  const recordTip = useCallback(
    (address: string) => {
      if (!publicKey) return;
      incrementTipCount(publicKey, address);
    },
    [publicKey, incrementTipCount]
  );

  const sortedFavorites = useCallback(
    (sortBy: 'recent' | 'most_tipped' | 'alphabetical' = 'recent') => {
      const result = [...favorites];
      switch (sortBy) {
        case 'recent':
          return result.sort((a, b) => b.addedAt - a.addedAt);
        case 'most_tipped':
          return result.sort((a, b) => b.tipCount - a.tipCount);
        case 'alphabetical':
          return result.sort((a, b) => a.username.localeCompare(b.username));
        default:
          return result;
      }
    },
    [favorites]
  );

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    recordTip,
    sortedFavorites,
    removeFavorite: (address: string) => publicKey && removeFavorite(publicKey, address),
  };
};
