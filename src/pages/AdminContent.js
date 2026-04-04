import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiTrash2, FiSearch, FiImage, FiVideo } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { contentAPI, formatDate } from '../services/api';
import api from '../services/api';
import toast from 'react-hot-toast';
import './AdminContent.css';

export default function AdminContent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-content', search, page],
    queryFn: () => api.get('/content/admin/list', { params: { search: search || undefined, page, limit: 20 } }).then((r) => r.data),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => contentAPI.delete(id),
    onSuccess: () => {
      toast.success('Contenu supprimé');
      queryClient.invalidateQueries({ queryKey: ['admin-content'] });
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  function handleSearch(e) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function handleDelete(id) {
    if (!window.confirm('Supprimer ce contenu définitivement ?')) return;
    deleteMutation.mutate(id);
  }

  const contents = data?.contents ?? [];

  return (
    <div className="page adm-content">
      <div className="container">
        <h2 className="adm-content__title">Modération du contenu</h2>

        <form className="adm-content__search" onSubmit={handleSearch}>
          <div className="adm-content__search-wrap">
            <FiSearch size={18} color="var(--text-secondary)" />
            <input
              type="text"
              className="adm-content__search-input"
              placeholder="Rechercher par description..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn--outline btn--sm">Chercher</button>
          {search && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>
              Effacer
            </button>
          )}
        </form>

        {isLoading ? (
          <div className="loading-center" style={{ height: 200 }}><div className="spinner" /></div>
        ) : (
          <>
            <p className="adm-content__count">{data?.total ?? 0} publication(s)</p>

            <div className="adm-content__grid">
              {contents.map((c) => (
                <div key={c.id} className="adm-content__item">
                  <Link to={`/contenu/${c.id}`} className="adm-content__media-link">
                    {c.thumbnail_url || c.file_url ? (
                      <img
                        src={c.thumbnail_url || c.file_url}
                        alt=""
                        className="adm-content__img"
                        loading="lazy"
                      />
                    ) : (
                      <div className="adm-content__no-media">
                        {c.content_type === 'video' ? <FiVideo size={24} /> : <FiImage size={24} />}
                      </div>
                    )}
                    {c.content_type === 'video' && (
                      <span className="adm-content__type-badge">Vidéo</span>
                    )}
                  </Link>
                  <div className="adm-content__info">
                    <Link to={`/profil/${c.creator?.username}`} className="adm-content__creator">
                      @{c.creator?.username}
                    </Link>
                    {c.description && (
                      <p className="adm-content__desc">{c.description.slice(0, 80)}{c.description.length > 80 ? '…' : ''}</p>
                    )}
                    <span className="adm-content__date">{formatDate(c.created_at)}</span>
                  </div>
                  <button
                    className="adm-content__delete-btn"
                    onClick={() => handleDelete(c.id)}
                    disabled={deleteMutation.isPending}
                    title="Supprimer"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {contents.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                Aucun contenu trouvé.
              </div>
            )}

            {/* Pagination */}
            {(data?.totalPages ?? 1) > 1 && (
              <div className="adm-content__pagination">
                <button
                  className="btn btn--outline btn--sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Précédent
                </button>
                <span className="adm-content__page-info">
                  Page {page} / {data.totalPages}
                </span>
                <button
                  className="btn btn--outline btn--sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Suivant →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
