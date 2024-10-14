import React, { useState } from 'react';

const HighHandBoard = ({ tableId }) => {
    const [nlhQualifiers, setNlhQualifiers] = useState('');
    const [ploQualifiers, setPloQualifiers] = useState('');

    const handleNlhChange = (e) => {
        if (e.target.value.length <= 5) {
            setNlhQualifiers(e.target.value);
        }
    };

    const handlePloChange = (e) => {
        if (e.target.value.length <= 5) {
            setPloQualifiers(e.target.value);
        }
    };

    return (
        <div className="high-hand-board">
            <h2>High Hand</h2>
            <div className="high-hand-cards">
                {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="high-hand-card">Card {index + 1}</div>
                ))}
            </div>
            <div className="table-id">Table ID: {tableId}</div>
            <div className="qualifiers-box">
                <div>
                    <label>NLH:</label>
                    <input type="text" value={nlhQualifiers} onChange={handleNlhChange} />
                </div>
                <div>
                    <label>PLO:</label>
                    <input type="text" value={ploQualifiers} onChange={handlePloChange} />
                </div>
            </div>
        </div>
    );
};

export default HighHandBoard;