import React, { useRef, useState, useCallback } from 'react';
import './PokerTable.css';

export const renderCard = (card) => {
    // deckofcardsapi uses "0" for 10, but backend strRepr uses "T"
    let code = card.strRepr.toUpperCase();
    if (code.startsWith('T')) {
        code = '0' + code.substring(1);
    }
    return (
        <div className="card">
            <img
                src={`https://deckofcardsapi.com/static/img/${code}.png`}
                alt={`${card.value} of ${card.suit}`}
            />
        </div>
    );
};

export const PokerTable = ({ tableData, tableNumber, isHighHandTable }) => {
    const chairsPerTable = tableData.playerCards.length;
    const angleStep = 360 / chairsPerTable;
    const tableWidth = 420;
    const tableHeight = 260;
    const chairSize = 65;

    const cardRef = useRef(null);
    const hoverTimerRef = useRef(null);
    const [hoverStyle, setHoverStyle] = useState(null);

    const triggerZoom = useCallback(() => {
        const el = cardRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const elCenterX = rect.left + rect.width / 2;
        const elCenterY = rect.top + rect.height / 2;
        const vpCenterX = window.innerWidth / 2;
        const vpCenterY = window.innerHeight / 2;
        const scale = 2.8;
        const tx = (vpCenterX - elCenterX) / scale;
        const ty = (vpCenterY - elCenterY) / scale;
        setHoverStyle({
            transform: `scale(${scale}) translate(${tx}px, ${ty}px)`,
            zIndex: 1000,
        });
    }, []);

    const handleMouseEnter = useCallback(() => {
        hoverTimerRef.current = setTimeout(triggerZoom, 400);
    }, [triggerZoom]);

    const handleMouseMove = useCallback(() => {
        // no-op: allow zoom even if cursor moves
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
        }
        setHoverStyle(null);
    }, []);

    const getChairPosition = (index) => {
        const angle = (index * angleStep - 90) * (Math.PI / 180);
        const a = tableWidth / 2.4;  // horizontal semi-axis
        const b = tableHeight / 2.2; // vertical semi-axis
        const x = a * Math.cos(angle) - chairSize / 2 + tableWidth / 2;
        const y = b * Math.sin(angle) - chairSize / 2 + tableHeight / 2;
        return { position: 'absolute', left: x, top: y, width: chairSize, height: chairSize };
    };

    const isPlo = tableData.plo;
    const qualifies = tableData.qualifiesForHighHand;

    // Find the winning seat by matching hole cards against winning hand
    const winningSeatIndex = React.useMemo(() => {
        if (!tableData.winningHand || !tableData.playerCards) return -1;
        const winCardStrs = new Set(tableData.winningHand.map(c => c.strRepr));
        let bestIdx = -1;
        let bestMatches = 0;
        tableData.playerCards.forEach((playerCards, index) => {
            const matches = playerCards.filter(c => winCardStrs.has(c.strRepr)).length;
            if (matches > bestMatches) {
                bestMatches = matches;
                bestIdx = index;
            }
        });
        return bestIdx;
    }, [tableData]);

    return (
        <div
            ref={cardRef}
            className={`poker-table-card${qualifies ? ' qualifying' : ''}${hoverStyle ? ' zoomed' : ''}`}
            style={hoverStyle || undefined}
            onMouseEnter={handleMouseEnter}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {tableData.winningHand ? (
                <div className="winning-hand-display">
                    <span className="winning-label">Winner</span>
                    <div className="cards-row">
                        {tableData.winningHand.map((card, index) => (
                            <span key={index}>{renderCard(card)}</span>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="no-winning-hand">No Winning Hand</div>
            )}

            <div className="poker-table-header">
                <span className={`table-type-badge ${isPlo ? 'plo' : 'nlh'}`}>
                    {isPlo ? 'PLO' : 'NLH'}
                </span>
                <span className="table-number-label">#{tableNumber}</span>
                {qualifies && (
                    <span className="qualifying-badge">&#9733; QUALIFIES</span>
                )}
            </div>

            <div className="poker-table-wrapper" style={{ width: tableWidth }}>

                <div className="poker-table-felt" style={{ height: tableHeight }}>
                    {tableData.playerCards.map((playerCards, index) => (
                        <div key={index} className={`seat${index === winningSeatIndex ? ' winning-seat' : ''}`} style={getChairPosition(index)}>
                            <div className="cards-row">
                                {playerCards.map((card, cardIndex) => (
                                    <span key={cardIndex}>{renderCard(card)}</span>
                                ))}
                            </div>
                            <span className="seat-label">{index + 1}</span>
                        </div>
                    ))}

                    <div className="community-cards-display">
                        <div className="cards-row">
                            {tableData.communityCards && tableData.communityCards.map((card, index) => (
                                <span key={index}>{renderCard(card)}</span>
                            ))}
                        </div>
                    </div>

                    <div className="table-id-display">
                        Table {tableNumber}
                    </div>
                </div>
            </div>
        </div>
    );
};
