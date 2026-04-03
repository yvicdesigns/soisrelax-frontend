import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiX, FiCopy, FiCheck, FiUpload, FiMessageCircle,
         FiAlertCircle, FiClock, FiCheckCircle, FiSmartphone } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api, { paymentAPI, formatFCFA } from '../../services/api';
import './PaymentModal.css';

const PAYMENT_METHODS = [
  { id: 'mtn_momo',     label: 'MTN Mobile Money',  color: '#FFCB00', emoji: '🟡' },
  { id: 'airtel_money', label: 'Airtel Money',       color: '#FF0000', emoji: '🔴' },
];

const SUB_DURATIONS = [
  { months: 1, label: '1 mois' },
  { months: 3, label: '3 mois', badge: 'Économique' },
  { months: 6, label: '6 mois', badge: 'Meilleure offre' },
];

const PRESET_TIPS = [500, 1000, 2500, 5000];

// ─── Timer component ───────────────────────────────────────────
function CountdownTimer({ expiresAt, onExpired }) {
  const [remaining, setRemaining] = useState('');
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const diff = new Date(expiresAt) - Date.now();
      if (diff <= 0) {
        setRemaining('00:00');
        clearInterval(interval);
        onExpired?.();
        return;
      }
      const min = Math.floor(diff / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`);
      setUrgent(diff < 5 * 60 * 1000); // rouge si < 5 min
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  return (
    <div className={`pm-timer ${urgent ? 'pm-timer--urgent' : ''}`}>
      <FiClock size={14} />
      <span>Valide encore <strong>{remaining}</strong></span>
    </div>
  );
}

// ─── Copier dans le presse-papier ─────────────────────────────
function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button className="pm-copy-btn" onClick={handleCopy} title="Copier">
      {copied ? <FiCheck size={14} color="var(--success)" /> : <FiCopy size={14} />}
      <span>{copied ? 'Copié !' : label || 'Copier'}</span>
    </button>
  );
}

// ─── COMPOSANT PRINCIPAL ───────────────────────────────────────
export default function PaymentModal({ type, creator, content, onClose, onSuccess }) {
  const [step, setStep] = useState('method');   // method → instructions → proof → waiting → result
  const [method, setMethod] = useState(null);
  const [months, setMonths] = useState(1);
  const [tipAmount, setTipAmount] = useState(1000);
  const [paymentRequestId, setPaymentRequestId] = useState(null);
  const [instructions, setInstructions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [proofType, setProofType] = useState(null); // 'image' | 'id'
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const fileRef = useRef();
  const pollRef = useRef();

  const subscriptionPrice = creator?.subscription_price || 2500;
  const totalAmount = type === 'subscription' ? subscriptionPrice * months
    : type === 'ppv' ? content?.ppv_price || 0
    : tipAmount;

  // ── Polling du statut (toutes les 10s) ──────────────────────
  const startPolling = useCallback((reqId) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/payments/${reqId}/status`);
        const { status, rejection_reason } = res.data;
        setPaymentStatus(status);

        if (status === 'approved') {
          clearInterval(pollRef.current);
          setStep('result');
          onSuccess?.();
        } else if (status === 'rejected') {
          clearInterval(pollRef.current);
          setRejectionReason(rejection_reason || '');
          setStep('result');
        } else if (status === 'expired') {
          clearInterval(pollRef.current);
          setStep('result');
        }
      } catch { /* ignorer */ }
    }, 10000);
  }, [onSuccess]);

  useEffect(() => {
    return () => clearInterval(pollRef.current);
  }, []);

  // ── Étape 1 : Initier le paiement ───────────────────────────
  async function handleInitiate() {
    if (!method) { toast.error('Choisissez une méthode de paiement'); return; }
    setLoading(true);
    try {
      const payload = {
        creator_id: creator.id,
        payment_type: type,
        payment_method: method,
        months,
        ...(type === 'tip' && { tip_amount: tipAmount }),
        ...(type === 'ppv' && content?.id && { content_id: content.id }),
      };
      const res = await api.post('/payments/initiate', payload);
      setPaymentRequestId(res.data.payment_request_id);
      setInstructions(res.data.instructions);
      setStep('instructions');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'initialisation');
    } finally {
      setLoading(false);
    }
  }

  // ── Étape 3 : Soumettre la preuve ───────────────────────────
  async function handleSubmitProof() {
    if (proofType === 'image' && !proofFile) {
      toast.error('Ajoutez une capture d\'écran'); return;
    }
    if (proofType === 'id' && !transactionId.trim()) {
      toast.error('Entrez l\'identifiant de transaction'); return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      if (proofType === 'image') {
        formData.append('proof_image', proofFile);
      } else {
        formData.append('transaction_id', transactionId);
      }

      await api.post(`/payments/${paymentRequestId}/proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setStep('waiting');
      startPolling(paymentRequestId);
      toast.success('✅ Preuve envoyée ! Vérification en cours...');
    } catch (err) {
      const msg = err.response?.data?.error || 'Erreur lors de l\'envoi';
      toast.error(msg);
      if (msg.includes('doublon') || msg.includes('déjà été utilisée')) {
        // Fraud attempt — message fort
        toast.error('⚠️ Cette preuve a déjà été soumise. Envoyez votre vraie capture.', { duration: 6000 });
      }
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image trop grande. Maximum 10MB.'); return; }
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  }

  const handleExpired = useCallback(() => {
    setPaymentStatus('expired');
    setStep('result');
    clearInterval(pollRef.current);
  }, []);

  // ═══════════════════════════════════════════════════════════
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && step !== 'waiting' && onClose()}>
      <div className="modal-content pm">
        <div className="pm__handle" />

        {step !== 'waiting' && step !== 'result' && (
          <button className="pm__close" onClick={onClose} aria-label="Fermer">
            <FiX size={20} />
          </button>
        )}

        {/* ═══ ÉTAPE 0 — Choisir méthode + montant ═══════════════ */}
        {step === 'method' && (
          <div className="pm__section fade-in">
            <h2 className="pm__title">
              {type === 'subscription' && `S'abonner à ${creator?.display_name}`}
              {type === 'ppv' && 'Acheter ce contenu'}
              {type === 'tip' && `Envoyer un pourboire`}
            </h2>

            {/* Durées abonnement */}
            {type === 'subscription' && (
              <div className="pm__durations">
                {SUB_DURATIONS.map(({ months: m, label, badge }) => (
                  <button
                    key={m}
                    className={`pm__duration-btn ${months === m ? 'active' : ''}`}
                    onClick={() => setMonths(m)}
                  >
                    {badge && <span className="pm__duration-badge">{badge}</span>}
                    <span className="pm__duration-label">{label}</span>
                    <span className="pm__duration-price">{formatFCFA(subscriptionPrice * m)}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Montant pourboire */}
            {type === 'tip' && (
              <div className="pm__tips">
                <div className="pm__tips-presets">
                  {PRESET_TIPS.map((a) => (
                    <button
                      key={a}
                      className={`pm__tip-btn ${tipAmount === a ? 'active' : ''}`}
                      onClick={() => setTipAmount(a)}
                    >
                      {formatFCFA(a)}
                    </button>
                  ))}
                </div>
                <input
                  type="number" min={500} className="form-input"
                  placeholder="Montant libre (min 500 FCFA)"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(Math.max(500, parseInt(e.target.value) || 500))}
                />
              </div>
            )}

            {/* Résumé montant */}
            <div className="pm__amount-summary">
              <span>Total</span>
              <span className="pm__amount-big">{formatFCFA(totalAmount)}</span>
            </div>

            {/* Méthodes de paiement */}
            <p className="pm__section-label">Choisir le paiement Mobile Money</p>
            <div className="pm__methods">
              {PAYMENT_METHODS.map(({ id, label, color, emoji }) => (
                <button
                  key={id}
                  className={`pm__method-btn ${method === id ? 'active' : ''}`}
                  onClick={() => setMethod(id)}
                >
                  <span className="pm__method-dot" style={{ background: color }} />
                  <span className="pm__method-label">{emoji} {label}</span>
                  {method === id && <FiCheck size={18} color="var(--primary)" style={{ marginLeft: 'auto' }} />}
                </button>
              ))}
            </div>

            <button
              className="btn btn--primary btn--full btn--lg mt-4"
              onClick={handleInitiate}
              disabled={loading || !method}
            >
              {loading ? 'Génération en cours...' : 'Continuer →'}
            </button>
          </div>
        )}

        {/* ═══ ÉTAPE 1 — Instructions de paiement ════════════════
            Wireframe :
            ┌─────────────────────────────┐
            │  💰 Comment payer           │
            │  Étape 1 : Envoyez          │
            │  [Montant | méthode]        │
            │  Au numéro : XXXXXXXX       │
            │  Nom : SoisRelax Congo      │
            │  ⚠️ Indiquez ce code :      │
            │  [REF-XXXXXX-YYYYYY] [Copier]│
            │  ⏱ Valide encore XX:XX     │
            │  Étape 2 : Confirmez        │
            │  [📸 Capture] [⌨️ ID trans] │
            │  [J'ai payé →]              │
            └─────────────────────────────┘
        */}
        {step === 'instructions' && instructions && (
          <div className="pm__section fade-in">
            <h2 className="pm__title">💰 Comment payer</h2>

            <CountdownTimer expiresAt={instructions.expires_at} onExpired={handleExpired} />

            {/* Étape 1 */}
            <div className="pm__step-block">
              <div className="pm__step-num">1</div>
              <div className="pm__step-content">
                <p className="pm__step-title">Envoyez le montant</p>

                <div className="pm__instruction-box pm__instruction-box--amount">
                  <div className="pm__instr-amount">{formatFCFA(instructions.amount)}</div>
                  <div className="pm__instr-method">
                    via {PAYMENT_METHODS.find(m => m.id === instructions.payment_method)?.label}
                  </div>
                </div>

                <div className="pm__instruction-row">
                  <span className="pm__instr-label">Numéro :</span>
                  <span className="pm__instr-value">{instructions.account_number}</span>
                  <CopyButton value={instructions.account_number} />
                </div>
                <div className="pm__instruction-row">
                  <span className="pm__instr-label">Nom :</span>
                  <span className="pm__instr-value">{instructions.account_name}</span>
                </div>
              </div>
            </div>

            {/* Code de référence — CRITIQUE */}
            <div className="pm__ref-block">
              <div className="pm__ref-warning">
                <FiAlertCircle size={18} />
                <span>Indiquez impérativement ce code dans le motif du transfert :</span>
              </div>
              <div className="pm__ref-code">
                <span>{instructions.reference_code}</span>
                <CopyButton value={instructions.reference_code} label="Copier le code" />
              </div>
              <p className="pm__ref-hint">
                Sans ce code, votre paiement ne pourra pas être identifié.
              </p>
            </div>

            {/* FAQ rapide */}
            <details className="pm__faq">
              <summary className="pm__faq-toggle">❓ Questions fréquentes</summary>
              <div className="pm__faq-content">
                <p><strong>Comment transférer avec MTN MoMo ?</strong><br />
                Composez *126# ou utilisez l'app MTN. Choisissez « Envoyer de l'argent »,
                entrez le numéro et ajoutez le code REF dans le motif.</p>
                <p><strong>Que faire si je me trompe de montant ?</strong><br />
                Contactez le support WhatsApp immédiatement. Ne soumettez pas de fausse preuve.</p>
                <p><strong>Combien de temps pour la validation ?</strong><br />
                Généralement 15 à 30 minutes. En cas de retard, le créateur est averti automatiquement.</p>
              </div>
            </details>

            {/* Étape 2 */}
            <div className="pm__step-block">
              <div className="pm__step-num">2</div>
              <div className="pm__step-content">
                <p className="pm__step-title">Confirmez votre paiement</p>

                <div className="pm__proof-options">
                  <button
                    className={`pm__proof-btn ${proofType === 'image' ? 'active' : ''}`}
                    onClick={() => { setProofType('image'); fileRef.current?.click(); }}
                  >
                    <FiUpload size={20} />
                    <span>📸 Envoyer une capture d'écran</span>
                  </button>

                  <button
                    className={`pm__proof-btn ${proofType === 'id' ? 'active' : ''}`}
                    onClick={() => setProofType('id')}
                  >
                    <FiSmartphone size={20} />
                    <span>⌨️ Entrer l'ID de transaction</span>
                  </button>
                </div>

                <input
                  ref={fileRef} type="file" accept="image/*"
                  style={{ display: 'none' }} onChange={handleFileChange}
                />

                {proofType === 'image' && proofPreview && (
                  <div className="pm__proof-preview">
                    <img src={proofPreview} alt="Preuve de paiement" className="pm__proof-img" />
                    <button
                      className="pm__proof-change"
                      onClick={() => { setProofFile(null); setProofPreview(null); fileRef.current?.click(); }}
                    >
                      Changer la photo
                    </button>
                  </div>
                )}

                {proofType === 'id' && (
                  <div className="form-group mt-3">
                    <label className="form-label">Identifiant de transaction</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ex: MP241015.1234.AB1234"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      autoFocus
                    />
                    <p className="form-hint">Visible dans votre historique de transactions MTN/Airtel</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bouton principal */}
            <button
              className="btn btn--primary btn--full btn--lg"
              onClick={handleSubmitProof}
              disabled={loading || (!proofFile && !transactionId.trim())}
            >
              {loading ? 'Envoi en cours...' : "J'ai payé →"}
            </button>

            {/* Support WhatsApp */}
            <a
              href={`https://wa.me/${instructions.whatsapp_support?.replace(/\D/g, '')}?text=Bonjour, j'ai un problème avec mon paiement ${instructions.reference_code}`}
              target="_blank"
              rel="noreferrer"
              className="pm__whatsapp-btn"
            >
              <FiMessageCircle size={18} />
              <span>Besoin d'aide ? Contactez le support WhatsApp</span>
            </a>
          </div>
        )}

        {/* ═══ ÉTAPE 3 — Attente de validation ════════════════════ */}
        {step === 'waiting' && (
          <div className="pm__section pm__waiting fade-in">
            <div className="pm__waiting-icon">
              <div className="pm__waiting-pulse" />
              <FiClock size={36} color="var(--primary)" />
            </div>
            <h2>⏳ Vérification en cours</h2>
            <p className="pm__waiting-text">
              Votre preuve a bien été reçue. Un validateur vérifie votre paiement.
            </p>
            <div className="pm__waiting-steps">
              <div className="pm__waiting-step pm__waiting-step--done">
                <FiCheck size={14} /> Transfert effectué
              </div>
              <div className="pm__waiting-step pm__waiting-step--done">
                <FiCheck size={14} /> Preuve soumise
              </div>
              <div className="pm__waiting-step pm__waiting-step--active">
                <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                Validation en cours (15-30 min)
              </div>
            </div>

            {instructions && (
              <div className="pm__waiting-ref">
                Référence : <strong>{instructions.reference_code}</strong>
              </div>
            )}

            <a
              href={`https://wa.me/${instructions?.whatsapp_support?.replace(/\D/g, '')}?text=Bonjour, j'attends la validation de mon paiement ${instructions?.reference_code}`}
              target="_blank"
              rel="noreferrer"
              className="pm__whatsapp-btn mt-4"
            >
              <FiMessageCircle size={18} />
              <span>Contacter le support si délai dépassé</span>
            </a>
          </div>
        )}

        {/* ═══ RÉSULTAT (approuvé / rejeté / expiré) ══════════════ */}
        {step === 'result' && (
          <div className="pm__section pm__result fade-in">
            {paymentStatus === 'approved' && (
              <>
                <div className="pm__result-icon pm__result-icon--success">
                  <FiCheckCircle size={44} color="#fff" />
                </div>
                <h2 className="pm__result-title pm__result-title--success">
                  ✅ Paiement confirmé !
                </h2>
                <p className="pm__result-msg">
                  {type === 'subscription'
                    ? `Vous êtes maintenant abonné(e) à ${creator?.display_name}. Profitez du contenu exclusif !`
                    : type === 'ppv'
                    ? 'Accès au contenu accordé !'
                    : `Votre pourboire a bien été envoyé à ${creator?.display_name} !`}
                </p>
                <button className="btn btn--primary btn--full" onClick={onSuccess}>
                  Continuer
                </button>
              </>
            )}

            {paymentStatus === 'rejected' && (
              <>
                <div className="pm__result-icon pm__result-icon--error">
                  <FiX size={44} color="#fff" />
                </div>
                <h2 className="pm__result-title">❌ Paiement non confirmé</h2>
                {rejectionReason && (
                  <div className="pm__result-reason">
                    <strong>Raison :</strong> {rejectionReason}
                  </div>
                )}
                <p className="pm__result-msg">
                  Vous pouvez re-soumettre une preuve correcte ou contacter le support.
                </p>
                <button
                  className="btn btn--outline btn--full"
                  onClick={() => { setProofFile(null); setProofPreview(null); setTransactionId(''); setStep('instructions'); }}
                >
                  Re-soumettre une preuve
                </button>
                <button className="btn btn--ghost btn--full mt-2" onClick={onClose}>Fermer</button>
              </>
            )}

            {paymentStatus === 'expired' && (
              <>
                <div className="pm__result-icon pm__result-icon--warning">
                  <FiClock size={44} color="#fff" />
                </div>
                <h2 className="pm__result-title">⏱ Paiement expiré</h2>
                <p className="pm__result-msg">
                  Le délai de 30 minutes est dépassé. Démarrez un nouveau paiement.
                </p>
                <button className="btn btn--primary btn--full" onClick={() => setStep('method')}>
                  Recommencer
                </button>
                <button className="btn btn--ghost btn--full mt-2" onClick={onClose}>Annuler</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
