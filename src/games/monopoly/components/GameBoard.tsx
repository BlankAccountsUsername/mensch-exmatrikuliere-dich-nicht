import React, { useEffect, useState } from 'react';
import { BOARD_TILES, COLOR_GROUP_INFO } from '../game/boardData';
import type { GameState, Language } from '../game/types';
import { TRANSLATIONS } from '../i18n/translations';
import { COLOR_HEX } from './lobby/types';

interface GameBoardProps {
  state: GameState;
  language: Language;
  onSelectTile?: (tileIndex: number) => void;
}

type EdgeKind = 'bottom' | 'left' | 'top' | 'right' | 'corner';

function getGridCoords(tileIndex: number): { row: number; col: number; edge: EdgeKind } {
  if (tileIndex === 0) return { row: 11, col: 11, edge: 'corner' };
  if (tileIndex > 0 && tileIndex < 10) return { row: 11, col: 11 - tileIndex, edge: 'bottom' };
  if (tileIndex === 10) return { row: 11, col: 1, edge: 'corner' };
  if (tileIndex > 10 && tileIndex < 20) return { row: 11 - (tileIndex - 10), col: 1, edge: 'left' };
  if (tileIndex === 20) return { row: 1, col: 1, edge: 'corner' };
  if (tileIndex > 20 && tileIndex < 30) return { row: 1, col: 1 + (tileIndex - 20), edge: 'top' };
  if (tileIndex === 30) return { row: 1, col: 11, edge: 'corner' };
  return { row: 1 + (tileIndex - 30), col: 11, edge: 'right' };
}

function getTileIcon(type: string): string {
  switch (type) {
    case 'start':
      return '🎓';
    case 'jail':
      return '🏛️';
    case 'parking':
      return '🌿';
    case 'goto_jail':
      return '🚨';
    case 'chance':
      return '❓';
    case 'chest':
      return '📬';
    case 'transit':
      return '🚆';
    case 'utility':
      return '⚡';
    case 'tax':
      return '💸';
    default:
      return '';
  }
}

function getFlexDirection(edge: EdgeKind): React.CSSProperties['flexDirection'] {
  switch (edge) {
    case 'bottom':
      return 'column'; // bar on top (facing center)
    case 'top':
      return 'column-reverse'; // bar on bottom (facing center)
    case 'left':
      return 'row-reverse'; // bar on right (facing center)
    case 'right':
      return 'row'; // bar on left (facing center)
    case 'corner':
      return 'column';
  }
}

export const GameBoard: React.FC<GameBoardProps> = ({ state, language, onSelectTile }) => {
  const t = TRANSLATIONS[language];
  const [displayPositions, setDisplayPositions] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {};
    for (const p of state.players) init[p.index] = p.position;
    return init;
  });

  useEffect(() => {
    const needsStep = state.players.some(
      (p) => !p.bankrupt && (displayPositions[p.index] ?? p.position) !== p.position
    );
    if (!needsStep) return;

    const timer = window.setTimeout(() => {
      setDisplayPositions((prev) => {
        const next: Record<number, number> = { ...prev };
        for (const p of state.players) {
          const cur = prev[p.index] ?? p.position;
          if (cur === p.position) continue;
          if (p.inJail && p.position === 10) {
            // Direct detention teleport
            next[p.index] = 10;
          } else {
            const forwardDist = (p.position - cur + 40) % 40;
            // Step forward 1 tile at a time for normal movement (<= 16 tiles), or snap if huge jump
            next[p.index] = forwardDist <= 16 ? (cur + 1) % 40 : p.position;
          }
        }
        return next;
      });
    }, 105);

    return () => window.clearTimeout(timer);
  }, [state.players, displayPositions]);

  return (
    <div className="monopoly-board-frame">
      <div className="monopoly-board">
        {BOARD_TILES.map((tile) => {
          const { row, col, edge } = getGridCoords(tile.index);
          const prop = state.properties[tile.index];
          const owner = prop && prop.ownerIndex !== null ? state.players[prop.ownerIndex] : null;
          const groupColor = tile.group ? COLOR_GROUP_INFO[tile.group].hex : null;
          const playersHere = state.players.filter(
            (p) => !p.bankrupt && (displayPositions[p.index] ?? p.position) === tile.index
          );
          const ringPlayer =
            playersHere.find((p) => p.index === state.currentTurn) ?? playersHere[0] ?? null;
          const isJailCorner = tile.index === 10;
          const jailedPlayers = isJailCorner ? playersHere.filter((p) => p.inJail) : [];
          const visitingPlayers = isJailCorner ? playersHere.filter((p) => !p.inJail) : [];
          const icon = getTileIcon(tile.type);
          const isPending = state.pendingTileIndex === tile.index;
          const isHorizontalBar = edge === 'bottom' || edge === 'top';
          const isVerticalBar = edge === 'left' || edge === 'right';

          const barBorderStyle: React.CSSProperties =
            edge === 'bottom'
              ? { borderBottom: '1.5px solid var(--ink)' }
              : edge === 'top'
                ? { borderTop: '1.5px solid var(--ink)' }
                : edge === 'left'
                  ? { borderLeft: '1.5px solid var(--ink)' }
                  : { borderRight: '1.5px solid var(--ink)' };

          return (
            <div
              key={tile.index}
              className={`board-tile ${prop?.mortgaged ? 'mortgaged' : ''}`}
              onClick={() => onSelectTile?.(tile.index)}
              title={tile.name[language]}
              style={{
                gridRow: row,
                gridColumn: col,
                flexDirection: getFlexDirection(edge),
                boxShadow: isPending
                  ? 'inset 0 0 0 2.5px var(--c-rot)'
                  : ringPlayer
                    ? `inset 0 0 0 2.5px ${COLOR_HEX[ringPlayer.color]}`
                    : undefined,
                background:
                  tile.index === 0
                    ? '#f3e5c3'
                    : tile.index === 10
                      ? '#efe3d1'
                      : tile.index === 20
                        ? '#e6efe2'
                        : tile.index === 30
                          ? '#f5dfd9'
                          : owner
                            ? `${COLOR_HEX[owner.color]}22`
                            : undefined,
              }}
            >
              {/* Color band facing the center of the board */}
              {groupColor && (
                <div
                  style={{
                    ...(isHorizontalBar
                      ? { height: '13px', width: '100%' }
                      : { width: '13px', height: '100%' }),
                    background: groupColor,
                    ...barBorderStyle,
                    display: 'flex',
                    flexDirection: isVerticalBar ? 'column' : 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1px',
                    flexShrink: 0,
                  }}
                >
                  {prop && prop.houses > 0 && prop.houses < 5 && (
                    <span
                      style={{
                        fontSize: '0.48rem',
                        color: '#fff',
                        fontWeight: 800,
                        lineHeight: 1,
                        letterSpacing: '-1px',
                      }}
                    >
                      {'🏠'.repeat(prop.houses)}
                    </span>
                  )}
                  {prop && prop.houses === 5 && (
                    <span style={{ fontSize: '0.58rem', color: '#fff', fontWeight: 800, lineHeight: 1 }}>
                      🏛
                    </span>
                  )}
                </div>
              )}

              {/* Tile Body */}
              {isJailCorner ? (
                <div
                  style={{
                    position: 'relative',
                    flex: 1,
                    width: '100%',
                    height: '100%',
                  }}
                >
                  {/* Inner Detention Box (top-right, facing center) */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: '66%',
                      height: '66%',
                      background: '#e8c4a2',
                      borderLeft: '1.5px solid var(--ink)',
                      borderBottom: '1.5px solid var(--ink)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px',
                      gap: '1px',
                    }}
                  >
                    <span style={{ fontSize: '0.88rem', lineHeight: 1 }}>🏛️</span>
                    <span
                      style={{
                        fontFamily: 'var(--font-stamp)',
                        fontSize: '0.34rem',
                        fontWeight: 800,
                        color: 'var(--ink)',
                        lineHeight: 1,
                        textAlign: 'center',
                      }}
                    >
                      Prüfungsamt
                    </span>

                    {jailedPlayers.length > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexWrap: 'wrap',
                          gap: '1px',
                          pointerEvents: 'none',
                        }}
                      >
                        {jailedPlayers.map((p) => (
                          <span
                            key={p.color}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: `radial-gradient(circle at 32% 30%, #ffffff55 0%, ${COLOR_HEX[p.color]} 55%, #00000044 100%)`,
                              backgroundColor: COLOR_HEX[p.color],
                              border: '2px solid #fffdf8',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.45)',
                              fontSize: '0.62rem',
                              lineHeight: 1,
                            }}
                          >
                            {p.emoji ?? '🎓'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Outer "Nur zur Einsicht" label along bottom */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      left: '2px',
                      right: '2px',
                      textAlign: 'center',
                      fontSize: '0.4rem',
                      fontWeight: 800,
                      letterSpacing: '0.02em',
                      color: 'var(--ink)',
                      lineHeight: 1.05,
                    }}
                  >
                    {language === 'de' ? 'NUR ZUR EINSICHT' : 'JUST VISITING'}
                  </div>

                  {/* Visiting Pawns in outer L-strip */}
                  {visitingPlayers.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '2px',
                        bottom: '10px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '1px',
                        pointerEvents: 'none',
                      }}
                    >
                      {visitingPlayers.map((p) => (
                        <span
                          key={p.color}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: `radial-gradient(circle at 32% 30%, #ffffff55 0%, ${COLOR_HEX[p.color]} 55%, #00000044 100%)`,
                            backgroundColor: COLOR_HEX[p.color],
                            border: '2px solid #fffdf8',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.45)',
                            fontSize: '0.62rem',
                            lineHeight: 1,
                          }}
                        >
                          {p.emoji ?? '🎓'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: edge === 'corner' ? '4px 3px' : '2px 2px',
                      minWidth: 0,
                      minHeight: 0,
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        gap: '1px',
                      }}
                    >
                      {icon && (
                        <span style={{ fontSize: edge === 'corner' ? '1.25rem' : '0.82rem', lineHeight: 1 }}>
                          {icon}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: edge === 'corner' ? '0.54rem' : '0.46rem',
                          fontWeight: 700,
                          lineHeight: 1.05,
                          wordBreak: 'break-word',
                          color: 'var(--ink)',
                        }}
                      >
                        {tile.name[language]}
                      </span>
                    </div>

                    {/* Price / Owner Strip */}
                    {(owner || tile.price || tile.taxAmount || tile.index === 0) && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                          minHeight: '10px',
                        }}
                      >
                        {owner && (
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              background: COLOR_HEX[owner.color],
                              border: '1px solid var(--ink)',
                              display: 'inline-block',
                              flexShrink: 0,
                            }}
                          />
                        )}
                        {tile.price && (
                          <span
                            style={{
                              fontFamily: 'var(--font-stamp)',
                              fontSize: '0.46rem',
                              fontWeight: 700,
                              color: prop?.mortgaged ? 'var(--stamp-red)' : 'var(--ink-muted)',
                            }}
                          >
                            {prop?.mortgaged ? 'HYP' : `${tile.price}€`}
                          </span>
                        )}
                        {tile.taxAmount && (
                          <span
                            style={{
                              fontFamily: 'var(--font-stamp)',
                              fontSize: '0.46rem',
                              fontWeight: 700,
                              color: 'var(--stamp-red)',
                            }}
                          >
                            -{tile.taxAmount}€
                          </span>
                        )}
                        {tile.index === 0 && (
                          <span
                            style={{
                              fontFamily: 'var(--font-stamp)',
                              fontSize: '0.5rem',
                              fontWeight: 800,
                              color: 'var(--stamp-red)',
                            }}
                          >
                            ← +200€
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Player Pawns (pinned to outer edge so street name stays readable) */}
                  {playersHere.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: edge === 'top' ? undefined : '2px',
                        top: edge === 'top' ? '2px' : undefined,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        gap: '2px',
                        pointerEvents: 'none',
                        padding: '1px 2px',
                        zIndex: 3,
                      }}
                    >
                      {playersHere.map((p) => {
                        const isActive = p.index === state.currentTurn;
                        return (
                          <span
                            key={p.color}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: isActive ? '23px' : '20px',
                              height: isActive ? '23px' : '20px',
                              borderRadius: '6px',
                              background: `radial-gradient(circle at 32% 30%, #ffffff55 0%, ${COLOR_HEX[p.color]} 55%, #00000044 100%)`,
                              backgroundColor: COLOR_HEX[p.color],
                              border: isActive ? '2.5px solid #fffdf8' : '2px solid #fffdf8',
                              boxShadow: isActive
                                ? `0 2px 6px rgba(0,0,0,0.55), 0 0 0 1.5px ${COLOR_HEX[p.color]}`
                                : '0 2px 4px rgba(0,0,0,0.45)',
                              fontSize: isActive ? '0.78rem' : '0.68rem',
                              lineHeight: 1,
                              transition: 'transform 100ms ease',
                            }}
                          >
                            {p.emoji ?? '🎓'}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* Center Tabletop Area */}
        <div className="board-center">
          {/* Top-left Fachschaftspost Deck */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              transform: 'rotate(-8deg)',
              padding: '8px 12px',
              borderRadius: '8px',
              background: '#e8f1fa',
              border: '2px solid var(--ink)',
              boxShadow: '3px 3px 0 #c3d6ea, 4px 4px 0 var(--ink)',
              fontSize: '0.68rem',
              fontWeight: 800,
              color: 'var(--c-blau)',
            }}
          >
            📬 {language === 'de' ? 'STUV-POST' : 'STUV MAIL'}
          </div>

          {/* Bottom-right Klausurenphase Deck */}
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              right: '16px',
              transform: 'rotate(-8deg)',
              padding: '8px 12px',
              borderRadius: '8px',
              background: '#fceae7',
              border: '2px solid var(--ink)',
              boxShadow: '3px 3px 0 #f2c6be, 4px 4px 0 var(--ink)',
              fontSize: '0.68rem',
              fontWeight: 800,
              color: 'var(--c-rot)',
            }}
          >
            ❓ {language === 'de' ? 'KLAUSURENPHASE' : 'EXAM SEASON'}
          </div>

          {/* Center Title Banner */}
          <div
            style={{
              padding: '12px 22px',
              borderRadius: '10px',
              border: '3px solid var(--ink)',
              background: '#fbf7ee',
              boxShadow: '4px 4px 0 rgba(35,29,23,0.18)',
              transform: 'rotate(-2deg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-stamp)',
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: 'var(--c-rot)',
              }}
            >
              DHBW KARLSRUHE EDITION · €
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.25rem, 2.7vw, 1.95rem)',
                fontWeight: 800,
                lineHeight: 1.05,
                color: 'var(--ink)',
              }}
            >
              CAMPUS MONOPOLY
            </div>
          </div>

          {state.settings.freeParkingPot && (
            <div
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: '1.5px dashed #7c6b4f',
                background: 'rgba(255,253,245,0.8)',
                fontFamily: 'var(--font-stamp)',
                fontSize: '0.82rem',
                fontWeight: 700,
              }}
            >
              🌿 {t.campusPot}: {state.freeParkingPot} €
            </div>
          )}

          {state.lastDice && (
            <div
              key={`${state.turnCount}-${state.lastDice[0]}-${state.lastDice[1]}`}
              className="animate-dice"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '2px',
              }}
            >
              {state.lastDice.map((die, idx) => (
                <div
                  key={idx}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: '#fffdf8',
                    border: '2px solid var(--ink)',
                    boxShadow: '0 3px 0 var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-stamp)',
                    fontSize: '1.2rem',
                    fontWeight: 800,
                  }}
                >
                  {die}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
