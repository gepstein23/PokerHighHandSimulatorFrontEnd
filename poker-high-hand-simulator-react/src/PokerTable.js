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
    const tableWidth = 400;
    const tableHeight = 260;
    const chairSize = 65;

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

    return (
        <div className={`poker-table-card${qualifies ? ' qualifying' : ''}`}>
            <div className="poker-table-header">
                <span className={`table-type-badge ${isPlo ? 'plo' : 'nlh'}`}>
                    {isPlo ? 'PLO' : 'NLH'}
                </span>
                <span className="table-number-label">#{tableNumber}</span>
                {qualifies && (
                    <span className="qualifying-badge">&#9733; QUALIFIES</span>
                )}
            </div>

            <div className="poker-table-wrapper" style={{ width: tableWidth, height: tableHeight }}>
                <div className="poker-table-felt">
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

                    {tableData.playerCards.map((playerCards, index) => (
                        <div key={index} className="seat" style={getChairPosition(index)}>
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
