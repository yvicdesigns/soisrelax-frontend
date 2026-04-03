import React, { useState, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { contentAPI } from '../services/api';
import ContentCard from '../components/content/ContentCard';
import './Feed.css';

function Skeleton() {
  return (
    <div className="feed-skeleton">
      <div className="feed-skeleton__header">
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
        <div>
          <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 8 }} />
          <div className="skeleton" style={{ width: 80, height: 11, borderRadius: 8, marginTop: 6 }} />
        </div>
      </div>
      <div className="skeleton" style={{ width: '100%', height: 280 }} />
      <div style={{ padding: '12px 16px' }}>
        <div className="skeleton" style={{ width: 80, height: 20, borderRadius: 9999 }} />
      </div>
    </div>
  );
}

export default function Feed() {
  const [refreshKey, setRefreshKey] = useState(0);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['feed', refreshKey],
    queryFn: ({ pageParam = 1 }) => contentAPI.getFeed(pageParam).then((r) => r.data),
    getNextPageParam: (last) => last.page < last.totalPages ? last.page + 1 : undefined,
    staleTime: 60000,
  });

  const allContent = data?.pages.flatMap((p) => p.contents) ?? [];

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    refetch();
  }, [refetch]);

  // Scroll infini
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 200 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="page feed" onScroll={handleScroll}>
      {/* Pull to refresh indicateur */}
      <div className="feed__header container">
        <h2 className="feed__title">Mon fil</h2>
        <button className="btn btn--ghost btn--sm" onClick={handleRefresh}>
          Actualiser
        </button>
      </div>

      {isLoading && (
        <div className="feed__list">
          {[1, 2, 3].map((i) => <Skeleton key={i} />)}
        </div>
      )}

      {!isLoading && allContent.length === 0 && (
        <div className="feed__empty container">
          <div className="feed__empty-icon">📱</div>
          <h3>Votre fil est vide</h3>
          <p>Abonnez-vous à des créateurs pour voir leur contenu ici.</p>
          <a href="/recherche" className="btn btn--primary mt-4">
            Découvrir des créateurs
          </a>
        </div>
      )}

      <div className="feed__list">
        {allContent.map((content) => (
          <ContentCard
            key={content.id}
            content={content}
            onUpdate={handleRefresh}
          />
        ))}
      </div>

      {isFetchingNextPage && (
        <div className="loading-center" style={{ padding: '20px' }}>
          <div className="spinner" style={{ width: 30, height: 30 }} />
        </div>
      )}
    </div>
  );
}
