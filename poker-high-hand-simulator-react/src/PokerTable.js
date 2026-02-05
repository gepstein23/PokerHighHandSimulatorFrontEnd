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

export const PokerTable = ({ tableData, tableNumber }) => {
    const chairsPerTable = tableData.playerCards.length;
    const angleStep = 360 / chairsPerTable;
    const tableSize = 420;
    const chairSize = 80;

    const getChairPosition = (index) => {
        const angle = index * angleStep - 90; // start from top
        const radius = tableSize / 2.6;
        const x = radius * Math.cos((angle * Math.PI) / 180) - chairSize / 2 + tableSize / 2;
        const y = radius * Math.sin((angle * Math.PI) / 180) - chairSize / 2 + tableSize / 2;
        return { position: 'absolute', left: x, top: y, width: chairSize, height: chairSize };
    };

    const isPlo = tableData.plo;

    return (
        <div className="poker-table-card">
            <div className="poker-table-header">
                <span className={`table-type-badge ${isPlo ? 'plo' : 'nlh'}`}>
                    {isPlo ? 'PLO' : 'NLH'}
                </span>
                {tableData.qualifiesForHighHand && (
                    <span className="qualifying-badge">&#9733; QUALIFIES</span>
                )}
            </div>

            <div className="poker-table-wrapper" style={{ width: tableSize, height: tableSize }}>
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
                        {tableNumber.substring(0, 8)}
                    </div>
                </div>
            </div>
        </div>
    );
};
