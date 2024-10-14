import React, { useState } from 'react';
import axios from 'axios';

const SimulationControls = () => {
    const [numNlhTables, setNumNlhTables] = useState(0);
    const [numPloTables, setNumPloTables] = useState(0);
    const [numHandsPerHour, setNumHandsPerHour] = useState(0);
    const [numPlayersPerTable, setNumPlayersPerTable] = useState(0);
    const [simulationDuration, setSimulationDuration] = useState(1); // Default to 1 hour
    const [nlhMinimumQualifyingHand, setNlhMinimumQualifyingHand] = useState('');
    const [ploMinimumQualifyingHand, setPloMinimumQualifyingHand] = useState('');
    const [noPloFlopRestriction, setNoPloFlopRestriction] = useState(false);
    const [isRunning, setIsRunning] = useState(false);

    const startSimulation = async () => {
        try {
            const requestBody = {
                numNlhTables,
                numPloTables,
                numHandsPerHour,
                numPlayersPerTable,
                simulationDuration,
                nlhMinimumQualifyingHand,
                ploMinimumQualifyingHand,
                noPloFlopRestriction,
            };

            const response = await axios.post('/api/simulations/start', requestBody);
            console.log('Simulation started:', response.data);
            setIsRunning(true);
        } catch (error) {
            console.error('Error starting simulation:', error);
        }
    };

    const stopSimulation = async () => {
        try {
            const response = await axios.post('/api/simulations/stop', { /* include any required data */ });
            console.log('Simulation stopped:', response.data);
            setIsRunning(false);
        } catch (error) {
            console.error('Error stopping simulation:', error);
        }
    };

    return (
        <div>
            <h2>Simulation Controls</h2>
            <div>
                <label>
                    Number of NLH Tables:
                    <input type="number" value={numNlhTables} onChange={(e) => setNumNlhTables(e.target.value)} />
                </label>
                <label>
                    Number of PLO Tables:
                    <input type="number" value={numPloTables} onChange={(e) => setNumPloTables(e.target.value)} />
                </label>
                <label>
                    Hands per Hour:
                    <input type="number" value={numHandsPerHour} onChange={(e) => setNumHandsPerHour(e.target.value)} />
                </label>
                <label>
                    Players per Table:
                    <input type="number" value={numPlayersPerTable} onChange={(e) => setNumPlayersPerTable(e.target.value)} />
                </label>
                <label>
                    Simulation Duration (hours):
                    <input type="number" value={simulationDuration} onChange={(e) => setSimulationDuration(e.target.value)} />
                </label>
                <label>
                    NLH Minimum Qualifying Hand:
                    <input type="text" value={nlhMinimumQualifyingHand} onChange={(e) => setNlhMinimumQualifyingHand(e.target.value)} />
                </label>
                <label>
                    PLO Minimum Qualifying Hand:
                    <input type="text" value={ploMinimumQualifyingHand} onChange={(e) => setPloMinimumQualifyingHand(e.target.value)} />
                </label>
                <label>
                    No PLO Flop Restriction:
                    <input type="checkbox" checked={noPloFlopRestriction} onChange={(e) => setNoPloFlopRestriction(e.target.checked)} />
                </label>
            </div>
            <button onClick={startSimulation} disabled={isRunning}>Start Simulation</button>
            <button onClick={stopSimulation} disabled={!isRunning}>Stop Simulation</button>
        </div>
    );
};

export default SimulationControls;
