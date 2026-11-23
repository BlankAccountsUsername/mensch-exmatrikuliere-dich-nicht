import React, { useState } from 'react';
import { BOARD_TILES } from '../game/boardData';
import { isPropertyTradeable, validateTradeOffer } from '../game/trading';
import type { GameAction, GameState, Language, TradeOffer } from '../game/types';
import { Button, Dropdown } from '../../../shared/ui';

interface TradeModalProps {
  state: GameState;
  language: Language;
  localSeatIndices: number[];
  isOpen: boolean;
  initialOffer?: TradeOffer | null;
  onAction: (action: GameAction) => void;
  onClose: () => void;
}

export const TradeModal: React.FC<TradeModalProps> = ({
  state,
  language,
  localSeatIndices,
  isOpen,
  initialOffer,
  onAction,
  onClose,
}) => {
  const fromIdx = state.currentTurn;
  const fromPlayer = state.players[fromIdx];
  const candidates = state.players.filter((p) => !p.bankrupt && p.index !== fromIdx);

  const [toIdx, setToIdx] = useState<number>(() => initialOffer?.toIndex ?? candidates[0]?.index ?? 1);
  const [offerCash, setOfferCash] = useState(() => initialOffer?.offerCash ?? 0);
  const [requestCash, setRequestCash] = useState(() => initialOffer?.requestCash ?? 0);
  const [offerProps, setOfferProps] = useState<number[]>(() => initialOffer?.offerProperties ?? []);
  const [requestProps, setRequestProps] = useState<number[]>(() => initialOffer?.requestProperties ?? []);
  const [offerJailCards, setOfferJailCards] = useState(() => initialOffer?.offerJailCards ?? 0);
  const [requestJailCards, setRequestJailCards] = useState(() => initialOffer?.requestJailCards ?? 0);

  // Incoming Trade Review (docked side-panel, board remains visible)
  if (state.phase === 'TRADE_REVIEW' && state.pendingTrade) {
    const offer = state.pendingTrade;
    const sender = state.players[offer.fromIndex];
    const receiver = state.players[offer.toIndex];
    const canRespond = localSeatIndices.includes(offer.toIndex);

    return (
      <div
        role="region"
        aria-label={language === 'de' ? 'Tauschangebot' : 'Trade Offer'}
        className="paper-card"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          border: '2px solid var(--ink)',
        }}
      >
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', wordBreak: 'break-word' }}>
            🤝 {language === 'de' ? 'Tauschangebot' : 'Trade Offer'}: {sender.name} → {receiver.name}
          </strong>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
              gap: '10px',
              background: '#fbf5e9',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #d6c3a3',
              fontSize: '0.82rem',
              wordBreak: 'break-word',
            }}
          >
            <div>
              <strong>{sender.name} {language === 'de' ? 'bietet:' : 'offers:'}</strong>
              <div>{offer.offerCash > 0 ? `${offer.offerCash} €` : null}</div>
              <div>{offer.offerJailCards > 0 ? `🎫 ×${offer.offerJailCards}` : null}</div>
              {offer.offerProperties.map((idx) => (
                <div key={idx}>• {BOARD_TILES[idx].name[language]}</div>
              ))}
            </div>
            <div>
              <strong>{sender.name} {language === 'de' ? 'möchte:' : 'wants:'}</strong>
              <div>{offer.requestCash > 0 ? `${offer.requestCash} €` : null}</div>
              <div>{offer.requestJailCards > 0 ? `🎫 ×${offer.requestJailCards}` : null}</div>
              {offer.requestProperties.map((idx) => (
                <div key={idx}>• {BOARD_TILES[idx].name[language]}</div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              variant="success"
              disabled={!canRespond}
              onClick={() => onAction({ type: 'RESPOND_TRADE', accept: true })}
              style={{ flex: 1 }}
            >
              {language === 'de' ? 'Annehmen' : 'Accept'}
            </Button>
            <Button
              variant="primary"
              disabled={!canRespond}
              onClick={() => onAction({ type: 'RESPOND_TRADE', accept: false })}
              style={{ flex: 1 }}
            >
              {language === 'de' ? 'Ablehnen' : 'Decline'}
            </Button>
          </div>
        </div>
    );
  }

  if (!isOpen || candidates.length === 0) return null;

  const effectiveToIdx = candidates.some((c) => c.index === toIdx) ? toIdx : candidates[0].index;
  const toPlayer = state.players[effectiveToIdx];
  const myProps = BOARD_TILES.filter((t) => isPropertyTradeable(state, fromIdx, t.index));
  const theirProps = BOARD_TILES.filter((t) => isPropertyTradeable(state, effectiveToIdx, t.index));

  const toggleProp = (list: number[], setList: (v: number[]) => void, idx: number) => {
    setList(list.includes(idx) ? list.filter((x) => x !== idx) : [...list, idx]);
  };

  const draftOffer: TradeOffer = {
    fromIndex: fromIdx,
    toIndex: effectiveToIdx,
    offerCash,
    requestCash,
    offerProperties: offerProps,
    requestProperties: requestProps,
    offerJailCards,
    requestJailCards,
  };
  const valid = validateTradeOffer(state, draftOffer);

  return (
    <div
      role="region"
      aria-label={language === 'de' ? 'Handel vorschlagen' : 'Propose Trade'}
      className="paper-card"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        border: '2px solid var(--ink)',
        maxHeight: 'calc(100dvh - 48px)',
        overflowY: 'auto',
      }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
            🤝 {language === 'de' ? 'Handel vorschlagen' : 'Propose Trade'}
          </strong>
          <Button size="sm" onClick={onClose} style={{ padding: '4px 10px', flexShrink: 0 }}>
            ✕
          </Button>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', minWidth: 0 }}>
          <span style={{ flexShrink: 0 }}>{language === 'de' ? 'Partner:' : 'Partner:'}</span>
          <Dropdown
            value={String(effectiveToIdx)}
            onChange={(val) => {
              setToIdx(Number(val));
              setRequestProps([]);
              setRequestJailCards(0);
            }}
            style={{ flex: 1, minWidth: 0 }}
          >
            {candidates.map((c) => (
              <option key={c.index} value={String(c.index)}>
                {c.emoji ?? ''} {c.name} ({c.cash} €)
              </option>
            ))}
          </Dropdown>
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Offer side */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '0.8rem',
              background: '#fbf5e9',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #e2d5be',
              minWidth: 0,
            }}
          >
            <strong>{fromPlayer.name} {language === 'de' ? 'bietet' : 'offers'}</strong>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--ink-muted)', flexShrink: 0 }}>€:</span>
              <input
                type="number"
                min={0}
                max={fromPlayer.cash}
                step={10}
                value={offerCash}
                onChange={(e) => setOfferCash(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                style={{
                  width: '100%',
                  minWidth: 0,
                  boxSizing: 'border-box',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid #bfa988',
                }}
              />
            </label>
            {fromPlayer.jailCards > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={offerJailCards > 0}
                  onChange={(e) => setOfferJailCards(e.target.checked ? 1 : 0)}
                />
                🎫 {language === 'de' ? 'Freikarte' : 'Excuse Card'}
              </label>
            )}
            {myProps.length > 0 && (
              <div style={{ maxHeight: '130px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {myProps.map((t) => (
                  <label key={t.index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="checkbox"
                      checked={offerProps.includes(t.index)}
                      onChange={() => toggleProp(offerProps, setOfferProps, t.index)}
                    />
                    <span style={{ wordBreak: 'break-word' }}>{t.name[language]}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Request side */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '0.8rem',
              background: '#fbf5e9',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #e2d5be',
              minWidth: 0,
            }}
          >
            <strong>{toPlayer.name} {language === 'de' ? 'gibt' : 'gives'}</strong>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--ink-muted)', flexShrink: 0 }}>€:</span>
              <input
                type="number"
                min={0}
                max={toPlayer.cash}
                step={10}
                value={requestCash}
                onChange={(e) => setRequestCash(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                style={{
                  width: '100%',
                  minWidth: 0,
                  boxSizing: 'border-box',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid #bfa988',
                }}
              />
            </label>
            {toPlayer.jailCards > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={requestJailCards > 0}
                  onChange={(e) => setRequestJailCards(e.target.checked ? 1 : 0)}
                />
                🎫 {language === 'de' ? 'Freikarte' : 'Excuse Card'}
              </label>
            )}
            {theirProps.length > 0 && (
              <div style={{ maxHeight: '130px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {theirProps.map((t) => (
                  <label key={t.index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="checkbox"
                      checked={requestProps.includes(t.index)}
                      onChange={() => toggleProp(requestProps, setRequestProps, t.index)}
                    />
                    <span style={{ wordBreak: 'break-word' }}>{t.name[language]}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <Button
          variant="primary"
          disabled={!valid}
          onClick={() => {
            onAction({ type: 'PROPOSE_TRADE', offer: draftOffer });
            onClose();
          }}
        >
          {language === 'de' ? 'Angebot senden' : 'Send Offer'}
        </Button>
    </div>
  );
};
