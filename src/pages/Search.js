import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiX } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import { userAPI, formatFCFA } from '../services/api';
import './Search.css';

export default function Search() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const { data: searchData, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => userAPI.search(debouncedQuery).then((r) => r.data),
    enabled: debouncedQuery.length >= 2,
  });

  const { data: discoverData } = useQuery({
    queryKey: ['discover'],
    queryFn: () => userAPI.discover().then((r) => r.data),
    staleTime: 300000,
  });

  const users = searchData?.users ?? [];
  const creators = discoverData?.creators ?? [];
  const showSearch = debouncedQuery.length >= 2;

  return (
    <div className="page search">
      <div className="search__header">
        <div className="container">
          <div className="search__input-wrap">
            <FiSearch size={20} color="var(--text-secondary)" className="search__icon" />
            <input
              type="search"
              className="search__input"
              placeholder="Chercher un créateur..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button
                className="search__clear"
                onClick={() => { setQuery(''); setDebouncedQuery(''); }}
              >
                <FiX size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container">
        {/* Résultats de recherche */}
        {showSearch && (
          <>
            {isLoading && (
              <div className="loading-center">
                <div className="spinner" />
              </div>
            )}
            {!isLoading && users.length === 0 && (
              <div className="search__empty">
                <p>Aucun résultat pour « {debouncedQuery} »</p>
              </div>
            )}
            {users.map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </>
        )}

        {/* Découvrir */}
        {!showSearch && (
          <>
            <h3 className="search__section-title">Créateurs populaires</h3>
            {creators.map((creator) => (
              <UserCard key={creator.id} user={creator} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function UserCard({ user }) {
  return (
    <Link to={`/profil/${user.username}`} className="search-user-card">
      <div className="search-user-card__avatar">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt={user.display_name} className="avatar avatar--md" />
        ) : (
          <div className="avatar avatar--md search-user-card__avatar-placeholder">
            {user.display_name?.[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <div className="search-user-card__info">
        <div className="search-user-card__name">
          {user.display_name}
          {user.is_verified && <span className="search-user-card__verified">✓</span>}
        </div>
        <div className="search-user-card__meta">
          @{user.username}
          {user.role === 'creator' && user.subscription_price && (
            <span className="search-user-card__price">
              {formatFCFA(user.subscription_price)}/mois
            </span>
          )}
        </div>
        {user.followers_count > 0 && (
          <div className="search-user-card__followers">
            {user.followers_count} abonné{user.followers_count > 1 ? 's' : ''}
          </div>
        )}
      </div>
      {user.role === 'creator' && (
        <div className="search-user-card__badge badge badge--primary">
          Créateur
        </div>
      )}
    </Link>
  );
}
