import React, { useState } from 'react';
import { BOARD_TILES, COLOR_GROUP_INFO } from '../game/boardData';
import {
  canBuildOnTile,
  canMortgageTile,
  canSellOnTile,
  canUnmortgageTile,
  getMortgageValue,
  getUnmortgageCost,
} from '../game/helpers';
import type { GameAction, GameState, Language } from '../game/types';
import { COLOR_HEX } from './lobby/types';

interface PropertyManagerModalProps {
  state: GameState;
  language: Language;
  canAct: boolean;
  initialPlayerIndex?: number;
  onAction: (action: GameAction) => void;
  onClose: () => void;
}

export const PropertyManagerModal: React.FC<PropertyManagerModalProps> = ({
  state,
  language,
  canAct,
  initialPlayerIndex,
  onAction,
  onClose,
}) => {
  const [selectedPlayerIdx, setSelectedPlayerIdx] = useState<number>(
    () => initialPlayerIndex ?? state.currentTurn
  );
  const playerIdx = selectedPlayerIdx;
  const player = state.players[playerIdx] ?? state.players[state.currentTurn];
  const isTurnOwner = playerIdx === state.currentTurn;
  const canManage = canAct && isTurnOwner;
  const ownedTiles = BOARD_TILES.filter(
    (t) => state.properties[t.index]?.ownerIndex === playerIdx
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 55,
        background: 'rgba(28, 22, 16, 0.48)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="paper-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '85dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '2px solid var(--ink)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>
            🏘️ {player.emoji ?? ''} {player.name} — {player.cash} €
            {player.jailCards > 0 ? ` · 🎫 ×${player.jailCards}` : ''}
          </strong>
          <button type="button" className="tactile-btn" onClick={onClose} style={{ padding: '4px 10px' }}>
            ✕
          </button>
        </div>

        {/* Player Selector Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '8px 18px',
            borderBottom: '1px solid #e2d5be',
            overflowX: 'auto',
            flexShrink: 0,
            background: '#fbf7ee',
          }}
        >
          {state.players.map((p) => {
            const active = p.index === playerIdx;
            return (
              <button
                key={p.index}
                type="button"
                onClick={() => setSelectedPlayerIdx(p.index)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  border: active ? `2px solid ${COLOR_HEX[p.color]}` : '1.5px solid #d6c3a3',
                  background: active ? '#fffdf8' : '#f4ecdc',
                  fontWeight: active ? 800 : 600,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  opacity: p.bankrupt ? 0.55 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: COLOR_HEX[p.color],
                    border: '1px solid var(--ink)',
                  }}
                />
                {p.name}
              </button>
            );
          })}
        </div>

        <div style={{ padding: '14px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {ownedTiles.length === 0 ? (
            <p style={{ color: 'var(--ink-muted)', textAlign: 'center', margin: '16px 0' }}>
              {language === 'de' ? 'Noch keine Grundstücke im Besitz.' : 'No properties owned yet.'}
            </p>
          ) : (
            ownedTiles.map((tile) => {
              const prop = state.properties[tile.index];
              const groupColor = tile.group ? COLOR_GROUP_INFO[tile.group].hex : '#5a6577';
              const buildable = canManage && canBuildOnTile(state, playerIdx, tile.index);
              const sellable = canManage && canSellOnTile(state, playerIdx, tile.index);
              const mortgagable = canManage && canMortgageTile(state, playerIdx, tile.index);
              const unmortgagable = canManage && canUnmortgageTile(state, playerIdx, tile.index);

              return (
                <div
                  key={tile.index}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #d6c3a3',
                    background: prop.mortgaged ? '#ebe3d3' : '#fffdf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px' }}>
                    <span
                      style={{
                        width: 12,
                        height: 24,
                        borderRadius: '4px',
                        background: groupColor,
                        border: '1px solid var(--ink)',
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{tile.name[language]}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--ink-muted)' }}>
                        {prop.mortgaged
                          ? language === 'de'
                            ? `Beliehen (Auslösen: ${getUnmortgageCost(tile)} €)`
                            : `Mortgaged (Redeem: ${getUnmortgageCost(tile)} €)`
                          : prop.houses === 5
                            ? '🏛 Lehrstuhl'
                            : prop.houses > 0
                              ? `${'🏠'.repeat(prop.houses)} (${prop.houses})`
                              : language === 'de'
                                ? 'Unbebaut'
                                : 'Undeveloped'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {tile.type === 'street' && (
                      <>
                        <button
                          type="button"
                          className="tactile-btn success"
                          disabled={!buildable}
                          onClick={() => onAction({ type: 'BUILD_HOUSE', tileIndex: tile.index })}
                          style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                        >
                          +🏠 {tile.houseCost}€
                        </button>
                        <button
                          type="button"
                          className="tactile-btn"
                          disabled={!sellable}
                          onClick={() => onAction({ type: 'SELL_HOUSE', tileIndex: tile.index })}
                          style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                        >
                          -🏠
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="tactile-btn"
                      disabled={prop.mortgaged ? !unmortgagable : !mortgagable}
                      onClick={() => onAction({ type: 'TOGGLE_MORTGAGE', tileIndex: tile.index })}
                      style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                    >
                      {prop.mortgaged
                        ? language === 'de'
                          ? `Auslösen -${getUnmortgageCost(tile)}€`
                          : `Redeem -${getUnmortgageCost(tile)}€`
                        : language === 'de'
                          ? `Beleihen +${getMortgageValue(tile)}€`
                          : `Mortgage +${getMortgageValue(tile)}€`}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
