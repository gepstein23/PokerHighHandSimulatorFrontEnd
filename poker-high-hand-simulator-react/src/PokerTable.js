export const renderCard = (card) => {
    // deckofcardsapi uses "0" for 10, but backend strRepr uses "T"
    let code = card.strRepr.toUpperCase();
    if (code.startsWith('T')) {
        code = '0' + code.substring(1);
    }
    return (
        <div className="card" style={{ margin: '0 5px', transform: 'scale(0.8)' }}>
            <img
                src={`https://deckofcardsapi.com/static/img/${code}.png`}
                alt={`${card.value} of ${card.suit}`}
                style={{ width: '60px', height: 'auto' }}
            />
        </div>
    );
};

export const PokerTable = ({ tableData, tableNumber }) => {
    const chairsPerTable = tableData.playerCards.length;
    const angleStep = 360 / chairsPerTable;
    const tableSize = 600;
    const chairSize = 100;

    const getChairPosition = (index) => {
        const angle = index * angleStep;
        const x = (tableSize / 2.5) * Math.cos((angle * Math.PI) / 180) - chairSize / 2 + tableSize / 2;
        const y = (tableSize / 2.5) * Math.sin((angle * Math.PI) / 180) - chairSize / 2 + tableSize / 2;
        return { position: 'absolute', left: x, top: y };
    };

    return (
        <div className="table-container" style={{ position: 'relative', width: tableSize, height: tableSize }}>
            <div className="table-outline" style={{ position: 'absolute', width: '100%', height: '100%', border: '5px solid black', borderRadius: '0%', zIndex: 1 }} />

            <div className="table" style={{ backgroundColor: 'green', borderRadius: '50%', width: '90%', height: '90%', position: 'relative' }}>
                {tableData.winningHand ? (
                    <div className="winning-hand" style={{ backgroundColor: 'red', padding: '10px', borderRadius: '5px', position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
                        <h3 style={{ margin: 0, color: 'white' }}>Winning Hand</h3>
                        <div className="cards">
                            {tableData.winningHand.map((card, index) => (
                                <div key={index}>
                                    {renderCard(card)}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="winning-hand" style={{ backgroundColor: '#666', padding: '10px', borderRadius: '5px', position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
                        <h3 style={{ margin: 0, color: 'white' }}>No Winning Hand</h3>
                    </div>
                )}

                {tableData.playerCards.map((playerCards, index) => (
                    <div key={index} className="seat" style={getChairPosition(index)}>
                        <div className="cards">
                            {playerCards.map((card, cardIndex) => (
                                <div key={cardIndex}>
                                    {renderCard(card)}
                                </div>
                            ))}
                        </div>
                        Seat {index + 1}
                    </div>
                ))}

                <div className="community-cards" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '2px solid yellow', borderRadius: '5px', padding: '5px', zIndex: 5 }}>
                    <h3 style={{ margin: '0 10px' }}>Community Cards</h3>
                    <div className="cards">
                        {tableData.communityCards && tableData.communityCards.map((card, index) => (
                            <div key={index}>
                                {renderCard(card)}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="table-id" style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 5 }}>
                    Table ID: {tableNumber}
                </div>
            </div>
        </div>
    );
};
