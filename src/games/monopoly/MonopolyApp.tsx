import { useEffect, useMemo, useState } from 'react';
import type { GameComponentProps } from '../../shared/collection/types';
import { ConnectionInfoModal } from '../../shared/components/ConnectionInfoModal';
import { Lobby as SharedLobby } from '../../shared/components/Lobby';
import { useGameEngine } from '../../shared/engine/useGameEngine';
import { ActionDock } from './components/ActionDock';
import { AuctionModal } from './components/AuctionModal';
import { GameBoard } from './components/GameBoard';
import { GameModeSelector } from './components/lobby/GameModeSelector';
import { PropertyManagerModal } from './components/PropertyManagerModal';
import { TileActionModal } from './components/TileActionModal';
import { TileDetailModal } from './components/TileDetailModal';
import { TradeModal } from './components/TradeModal';
import { WinnerModal } from './components/WinnerModal';
import { MonopolyEngine } from './game/MonopolyEngine';
import type { PlayerConfig, TradeOffer } from './game/types';
import { TRANSLATIONS } from './i18n/translations';

export function MonopolyApp({
  language,
  muted,
  onToggleLanguage,
  onToggleMute,
  onBackToGames,
}: GameComponentProps) {
  const [inspectedPlayerIndex, setInspectedPlayerIndex] = useState<number | null>(null);
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [showTrade, setShowTrade] = useState(false);
  const [tradeInitialOffer, setTradeInitialOffer] = useState<TradeOffer | null>(null);
  const [showConnectionInfo, setShowConnectionInfo] = useState(false);

  const { engine, snapshot: mp } = useGameEngine(() => new MonopolyEngine());
  const state = mp.gameState;

  const localSeatIndices = useMemo(
    () => engine.getLocalSeatIndices(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, mp.isGuest, mp.guestSeat]
  );

  const canActCurrentTurn = useMemo(() => {
    if (!state) return false;
    return localSeatIndices.includes(state.currentTurn);
  }, [state, localSeatIndices]);

  // Space keyboard shortcut for rolling dice, acknowledging cards, and ending turn
  useEffect(() => {
    if (!state) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
      if (inspectedPlayerIndex !== null || selectedTileIndex !== null || showTrade || showConnectionInfo) return;
      if (!canActCurrentTurn) return;

      if (state.phase === 'WAIT_ROLL') {
        e.preventDefault();
        engine.dispatchAction({ type: 'ROLL_DICE' });
      } else if (state.phase === 'CARD_MODAL') {
        e.preventDefault();
        engine.dispatchAction({ type: 'ACK_CARD' });
      } else if (state.phase === 'TURN_ACTION') {
        e.preventDefault();
        engine.dispatchAction({ type: state.canRollAgain ? 'ROLL_AGAIN' : 'END_TURN' });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state, canActCurrentTurn, inspectedPlayerIndex, selectedTileIndex, showTrade, showConnectionInfo, engine]);

  if (!state) {
    const t = TRANSLATIONS[language];
    return (
      <SharedLobby<PlayerConfig>
        gameId="monopoly"
        language={language}
        players={mp.players}
        lobbyRoster={mp.lobbyRoster}
        connectedSeats={mp.connectedSeats}
        hostLobbyCode={mp.hostLobbyCode}
        hostLobbyError={mp.hostLobbyError}
        initialRoomCode={mp.initialRoomCode}
        isGuest={mp.isGuest}
        guestSeat={mp.guestSeat}
        guestName={mp.guestName}
        guestMajor={mp.guestMajor}
        guestEmoji={mp.guestEmoji}
        guestConnected={mp.guestConnected}
        guestConnecting={mp.guestConnecting}
        guestError={mp.guestError}
        onChangePlayers={engine.setPlayers}
        onChangeGuestName={engine.setGuestName}
        onChangeGuestMajor={engine.setGuestMajor}
        onChangeGuestEmoji={engine.setGuestEmoji}
        onToggleLanguage={onToggleLanguage}
        onCloseRemoteSeat={engine.closeRemoteSeat}
        onStartGame={engine.startGame}
        onGuestJoinRoom={engine.joinRoomAsGuest}
        onGuestLeave={engine.leaveGuestRoom}
        onBackToGames={onBackToGames}
        minPlayers={engine.minPlayers}
        maxPlayers={engine.maxPlayers}
        onAddPlayer={() => engine.addPlayer('bot')}
        onRemovePlayer={engine.removePlayer}
        lastRoomCode={mp.lastRoomCode}
        onReconnectLastRoom={engine.reconnectLastRoom}
        titleOverride={t.title}
        subtitleOverride={t.subtitle}
        badgeOverride={`DHBW KARLSRUHE · ${language === 'de' ? 'ERZBERGERSTR. 121' : 'NORDSTADT CAMPUS'}`}
        startLabelOverride={t.startGame}
        customModeSelector={
          <GameModeSelector
            language={language}
            isGuest={mp.isGuest}
            settings={mp.settings}
            lobbySettings={mp.lobbySettings}
            onChangeSettings={engine.setSettings}
          />
        }
      />
    );
  }

  return (
    <div className="app-shell">
      <div className="game-layout">
        <GameBoard
          state={state}
          language={language}
          onSelectTile={(tileIdx) => setSelectedTileIndex(tileIdx)}
        />

        {showTrade || state.phase === 'TRADE_REVIEW' ? (
          <TradeModal
            key={tradeInitialOffer ? `rework-${state.turnCount}` : state.phase === 'TRADE_REVIEW' ? 'review' : 'new'}
            state={state}
            language={language}
            localSeatIndices={localSeatIndices}
            isOpen={showTrade}
            initialOffer={tradeInitialOffer}
            onAction={engine.dispatchAction}
            onClose={() => {
              setShowTrade(false);
              setTradeInitialOffer(null);
            }}
          />
        ) : (
          <ActionDock
            state={state}
            language={language}
            canAct={canActCurrentTurn}
            localSeatIndices={localSeatIndices}
            muted={muted}
            onAction={engine.dispatchAction}
            onOpenProperties={() => setInspectedPlayerIndex(state.currentTurn)}
            onOpenPropertiesForPlayer={(idx) => setInspectedPlayerIndex(idx)}
            onOpenTrade={() => {
              setTradeInitialOffer(null);
              setShowTrade(true);
            }}
            onReworkTrade={() => {
              setTradeInitialOffer(state.lastDeclinedTrade ?? null);
              setShowTrade(true);
            }}
            onOpenConnectionInfo={() => setShowConnectionInfo(true)}
            onToggleMute={onToggleMute}
            onToggleLanguage={onToggleLanguage}
            onReturnToLobby={engine.returnToLobby}
          />
        )}
      </div>

      <TileActionModal
        state={state}
        language={language}
        canAct={canActCurrentTurn}
        onAction={engine.dispatchAction}
      />

      <AuctionModal
        state={state}
        language={language}
        localSeatIndices={localSeatIndices}
        onAction={engine.dispatchAction}
      />

      {selectedTileIndex !== null && (
        <TileDetailModal
          state={state}
          tileIndex={selectedTileIndex}
          language={language}
          canAct={canActCurrentTurn}
          onAction={engine.dispatchAction}
          onClose={() => setSelectedTileIndex(null)}
        />
      )}

      {inspectedPlayerIndex !== null && (
        <PropertyManagerModal
          state={state}
          language={language}
          canAct={canActCurrentTurn}
          initialPlayerIndex={inspectedPlayerIndex}
          onAction={engine.dispatchAction}
          onClose={() => setInspectedPlayerIndex(null)}
        />
      )}

      {showConnectionInfo && (
        <ConnectionInfoModal
          players={state.players}
          language={language}
          isGuest={mp.isGuest}
          hostLobbyCode={mp.hostLobbyCode}
          connectedSeats={mp.connectedSeats}
          disconnectedSeats={mp.disconnectedSeats}
          seatTransports={mp.seatTransports}
          onClose={() => setShowConnectionInfo(false)}
        />
      )}

      <WinnerModal
        state={state}
        language={language}
        onReturnToLobby={engine.returnToLobby}
      />
    </div>
  );
}

export default MonopolyApp;
