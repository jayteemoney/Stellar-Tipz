import { Gift } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import TipCard from '@/components/shared/TipCard';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { mockTips } from '../mockData';

interface ActivityFeedProps {
  /** Creator address to filter tips for */
  address: string;
  /** Maximum number of tips to load per batch (default: 5) */
  limit?: number;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ address, limit = 5 }) => {
  const [displayCount, setDisplayCount] = useState(limit);

  /**
   * Filter tips received by the given address, sorted newest first.
   * Placeholder: uses mock data until contract is deployed.
   */
  const filteredAndSorted = useMemo(() => {
    return mockTips
      .filter((tip) => tip.to === address)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [address]);

  /** Tips visible at current pagination state */
  const visibleTips = useMemo(() => {
    return filteredAndSorted.slice(0, displayCount);
  }, [filteredAndSorted, displayCount]);

  /** Whether there are more tips to load */
  const hasMore = visibleTips.length < filteredAndSorted.length;

  /** Load the next batch of tips */
  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + limit);
  };

  // Empty state: no tips received
  if (filteredAndSorted.length === 0) {
    return (
      <EmptyState
        icon={<Gift size={32} />}
        title="No tips received yet"
        description="Share your public profile link and your first supporter will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* List of tips (newest first) */}
      <div className="grid gap-4 md:grid-cols-2">
        {visibleTips.map((tip) => (
          <TipCard
            key={`${tip.from}-${tip.timestamp}`}
            tip={tip}
            showSender={true}
            showReceiver={false}
          />
        ))}
      </div>

      {/* Load More button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={handleLoadMore}>
            Load More
          </Button>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
