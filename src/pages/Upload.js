import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiImage, FiVideo, FiX, FiDollarSign, FiLock, FiGlobe, FiUploadCloud } from 'react-icons/fi';
import { contentAPI, formatFCFA } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './Upload.css';

const PRICE_PRESETS = [1000, 2500, 5000, 10000];

export default function Upload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({
    description: '',
    is_free: false,
    is_ppv: false,
    ppv_price: 1000,
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;

    const isImage = f.type.startsWith('image/');
    const isVideo = f.type.startsWith('video/');

    if (!isImage && !isVideo) {
      toast.error('Format non supporté. Utilisez une image ou une vidéo.');
      return;
    }

    const maxSize = isVideo ? 200 : 10;
    if (f.size > maxSize * 1024 * 1024) {
      toast.error(`Fichier trop volumineux. Maximum ${maxSize}MB.`);
      return;
    }

    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview({ url, type: isVideo ? 'video' : 'image' });
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      const syntheticEvent = { target: { files: [f] } };
      handleFileChange(syntheticEvent);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!file && !form.description.trim()) {
      toast.error('Ajoutez un fichier ou une description.');
      return;
    }

    if (form.is_ppv && form.ppv_price < 500) {
      toast.error('Prix minimum: 500 FCFA');
      return;
    }

    const formData = new FormData();
    if (file) formData.append('file', file);
    formData.append('description', form.description);
    formData.append('content_type', file?.type.startsWith('video/') ? 'video' : 'image');
    formData.append('is_free', form.is_free.toString());
    formData.append('is_ppv', form.is_ppv.toString());
    formData.append('ppv_price', form.ppv_price.toString());

    setLoading(true);
    try {
      await contentAPI.create(formData);
      toast.success('Contenu publié avec succès !');
      navigate(`/profil/${user.username}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la publication');
    } finally {
      setLoading(false);
    }
  }

  const accessLabel = form.is_free
    ? 'Gratuit — Visible par tous'
    : form.is_ppv
    ? `Payant à l'unité — ${formatFCFA(form.ppv_price)}`
    : 'Abonnés seulement';

  return (
    <div className="page upload">
      <div className="container">
        <h2 className="upload__title">Nouvelle publication</h2>

        <form onSubmit={handleSubmit}>
          {/* Zone de dépôt */}
          <div
            className={`upload__dropzone ${file ? 'upload__dropzone--has-file' : ''}`}
            onClick={() => !file && fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {!file ? (
              <>
                <FiUploadCloud size={40} color="var(--text-light)" />
                <p className="upload__dropzone-text">
                  Appuyez pour choisir une photo ou vidéo
                </p>
                <p className="upload__dropzone-hint">
                  Images: JPG, PNG (max 10MB) · Vidéos: MP4 (max 200MB)
                </p>
                <button type="button" className="btn btn--outline btn--sm mt-3">
                  <FiImage size={16} /> Choisir un fichier
                </button>
              </>
            ) : (
              <>
                {preview?.type === 'image' ? (
                  <img src={preview.url} alt="Aperçu" className="upload__preview-img" />
                ) : (
                  <video src={preview.url} className="upload__preview-img" controls />
                )}
                <button
                  type="button"
                  className="upload__remove-btn"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                >
                  <FiX size={18} />
                </button>
              </>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description (facultatif)</label>
            <textarea
              className="form-input upload__textarea"
              placeholder="Décrivez votre contenu..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              maxLength={500}
            />
            <p className="form-hint">{form.description.length}/500</p>
          </div>

          {/* Accès */}
          <div className="upload__access-section">
            <label className="form-label">Qui peut voir ce contenu ?</label>

            <div className="upload__access-options">
              <button
                type="button"
                className={`upload__access-btn ${!form.is_free && !form.is_ppv ? 'active' : ''}`}
                onClick={() => setForm({ ...form, is_free: false, is_ppv: false })}
              >
                <FiLock size={20} color="var(--primary)" />
                <div>
                  <div className="upload__access-btn-title">Abonnés</div>
                  <div className="upload__access-btn-desc">Seuls vos abonnés payants</div>
                </div>
              </button>

              <button
                type="button"
                className={`upload__access-btn ${form.is_free ? 'active' : ''}`}
                onClick={() => setForm({ ...form, is_free: true, is_ppv: false })}
              >
                <FiGlobe size={20} color="var(--success)" />
                <div>
                  <div className="upload__access-btn-title">Gratuit</div>
                  <div className="upload__access-btn-desc">Visible par tout le monde</div>
                </div>
              </button>

              <button
                type="button"
                className={`upload__access-btn ${form.is_ppv ? 'active' : ''}`}
                onClick={() => setForm({ ...form, is_free: false, is_ppv: true })}
              >
                <FiDollarSign size={20} color="var(--warning)" />
                <div>
                  <div className="upload__access-btn-title">Prix unique</div>
                  <div className="upload__access-btn-desc">Achat à l'unité en FCFA</div>
                </div>
              </button>
            </div>

            {/* Prix PPV */}
            {form.is_ppv && (
              <div className="upload__ppv-price">
                <label className="form-label">Prix du contenu</label>
                <div className="upload__price-presets">
                  {PRICE_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`upload__price-btn ${form.ppv_price === p ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, ppv_price: p })}
                    >
                      {formatFCFA(p)}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Prix personnalisé (FCFA)"
                  value={form.ppv_price}
                  min={500}
                  onChange={(e) => setForm({ ...form, ppv_price: parseInt(e.target.value) || 500 })}
                />
              </div>
            )}
          </div>

          {/* Résumé accès */}
          <div className="upload__summary">
            <span>Accès:</span>
            <span className="upload__summary-value">{accessLabel}</span>
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--full btn--lg"
            disabled={loading}
          >
            {loading ? (
              <><span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Publication en cours...</>
            ) : (
              'Publier maintenant'
            )}
          </button>

          <button
            type="button"
            className="btn btn--ghost btn--full mt-2"
            onClick={() => navigate(-1)}
          >
            Annuler
          </button>
        </form>
      </div>
    </div>
  );
}
