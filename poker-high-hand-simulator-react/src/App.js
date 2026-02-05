import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';
import { PokerTable, renderCard } from './PokerTable';
import { Button, Form, Input, InputNumber, Switch, Progress } from "antd";

export const DEFAULT_NUM_PLO = 8;
export const DEFAULT_NUM_NLH = 8;
export const DEFAULT_NUM_PLAYERS = 8;
export const DEFAULT_SIM_DUR = 100;
export const DEFAULT_NUM_HANDS_PER_HOUR = 30;

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

const App = () => {
    const [isModalOpen, setIsModalOpen] = useState(true);
    const [simulationId, setSimulationId] = useState(null);
    const [gameState, setGameState] = useState(null);
    const [handNum, setHandNum] = useState(-1);
    const [isSimulationDone, setIsSimulationDone] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const [handsCompleted, setHandsCompleted] = useState(0);
    const [totalHands, setTotalHands] = useState(0);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const [ploMinimumQualifier, setPloMinimumQualifier] = useState("22233");
    const [nlhMinimumQualifier, setNlhMinimumQualifier] = useState("22233");
    const [numHandsPerHour, setNumHandsPerHour] = useState(DEFAULT_NUM_HANDS_PER_HOUR);
    const [numPLOTables, setNumPLOTables] = useState(DEFAULT_NUM_PLO);
    const [numNLHTables, setNumNLHTables] = useState(DEFAULT_NUM_NLH);
    const [seatsPerTable, setSeatsPerTable] = useState(DEFAULT_NUM_PLAYERS);
    const [simulationDuration, setSimulationDuration] = useState(DEFAULT_SIM_DUR);
    const [noPloFlopRestriction, setNoPloFlopRestriction] = useState(false);
    const [notifPhoneNumber, setNotifPhoneNumber] = useState(null);

    const calculateWinPercentage = (wins, totalHours) => {
        return totalHours > 0 ? ((wins / totalHours) * 100).toFixed(2) : 0;
    };

    const handleStartSimulation = async () => {
        try {
            setError(null);
            setLoading(true);
            const response = await axios.post(`${API_BASE_URL}/simulations/start`, {
                numNlhTables: numNLHTables,
                numPloTables: numPLOTables,
                numPlayersPerTable: seatsPerTable,
                numHandsPerHour: numHandsPerHour,
                simulationDuration: simulationDuration,
                nlhMinimumQualifyingHand: nlhMinimumQualifier,
                ploMinimumQualifyingHand: ploMinimumQualifier,
                noPloFlopRestriction: noPloFlopRestriction,
                notificationPhoneNumber: notifPhoneNumber,
            });
            setSimulationId(response.data);
            setTotalHands(simulationDuration * numHandsPerHour);
            setIsModalOpen(false);
            setIsPolling(true);
        } catch (err) {
            console.error("Error starting simulation:", err);
            setError("Failed to start simulation. Is the backend running at " + API_BASE_URL + "?");
        } finally {
            setLoading(false);
        }
    };

    // Poll progress using /progress endpoint
    useEffect(() => {
        if (!isPolling || !simulationId) return;

        const pollProgress = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/simulations/${simulationId}/progress`);
                setHandsCompleted(response.data.handsCompleted);
                if (response.data.status === 'DONE') {
                    setIsPolling(false);
                    setIsSimulationDone(true);
                }
            } catch (err) {
                console.error("Error polling progress:", err);
            }
        };

        pollProgress();
        const interval = setInterval(pollProgress, 2000);
        return () => clearInterval(interval);
    }, [isPolling, simulationId]);

    const handleProceed = async () => {
        const nextHandNum = handNum + 1;
        // Check if hand is available before making request
        if (!isSimulationDone && nextHandNum >= handsCompleted) {
            setError(`Hand ${nextHandNum + 1} is not yet simulated. ${handsCompleted} of ${totalHands} hands completed so far.`);
            return;
        }
        try {
            setError(null);
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/simulations/${simulationId}/hands/${nextHandNum}`);
            setHandNum(nextHandNum);
            setGameState(response.data);
        } catch (err) {
            console.error("Error fetching hand:", err);
            setError("Failed to fetch hand data.");
        } finally {
            setLoading(false);
        }
    };

    const handleStartNewSimulation = () => {
        setIsModalOpen(true);
        setSimulationId(null);
        setGameState(null);
        setHandNum(-1);
        setIsSimulationDone(false);
        setIsPolling(false);
        setHandsCompleted(0);
        setTotalHands(0);
        setError(null);
    };

    const progressPercent = totalHands > 0 ? Math.round((handsCompleted / totalHands) * 100) : 0;
    const canPlayHand = simulationId && (handsCompleted > 0 || isSimulationDone);

    return (
        <div>
            <h1 style={{fontSize: 80, fontFamily: "Georgia"}}>Poker High Hand Simulator</h1>
            <img hidden={!isModalOpen} style={{width: "30%", height: '30%'}} src={require('./cards.png')} alt="cards" />

            <p hidden={!isModalOpen} className="p1">Poker rooms use High Hand promotions to attract Texas Hold 'Em (NLH) and Pot Limit Omaha (PLO) players. In these promotions, the player with the best ranked poker hand during a set period, usually an hour, wins a set monetary prize.
                To be eligible, players pay a rake taken from qualifying pots. The challenge arises because PLO and NLH have different odds of getting the strongest hands. Some poker rooms address this discrepancy by restricting PLO players from winning the HH unless their hand utilizes the first 3 community cards.
                This project aims to find a fair solution for HH promotions and quantify the fairness of different HH promotion configurations.</p>
            <p hidden={!isModalOpen} className="p1">This program allows the user to simulate HH promotions running at a poker room with NLH and PLO tables. The program plays through poker hands per table, stores qualifying HHs per period, and compares them to qualifying HHs from other tables during the same period. Once the simulation concludes, the program outputs the winning statistics per game type for the simulation duration.</p>
            <p hidden={!isModalOpen} className="p1">Input the simulation parameters below to run a simulation asynchronously. Add an optional phone number to consent to receive a SMS once the simulation concludes.</p>

            {isModalOpen && (
                <Form
                    labelCol={{ span: 5 }}
                    wrapperCol={{ span: 30 }}
                    style={{
                        borderRadius: 25,
                        backgroundColor: "#006400",
                        margin: 50,
                        border: 500,
                        borderColor: "#111111",
                        alignContent: "center",
                        padding: 25
                    }}
                >
                    <Form.Item label="Number NLH Tables">
                        <InputNumber defaultValue={DEFAULT_NUM_NLH} min={0} onChange={(value) => setNumNLHTables(value ?? DEFAULT_NUM_NLH)} />
                    </Form.Item>
                    <Form.Item label="Number PLO Tables">
                        <InputNumber defaultValue={DEFAULT_NUM_PLO} min={0} onChange={(value) => setNumPLOTables(value ?? DEFAULT_NUM_PLO)} />
                    </Form.Item>
                    <Form.Item label="Players per Table">
                        <InputNumber defaultValue={DEFAULT_NUM_PLAYERS} min={2} max={10} onChange={(value) => setSeatsPerTable(value ?? DEFAULT_NUM_PLAYERS)} />
                    </Form.Item>
                    <Form.Item label="Simulation Duration (hours)">
                        <InputNumber defaultValue={DEFAULT_SIM_DUR} min={1} onChange={(value) => setSimulationDuration(value ?? DEFAULT_SIM_DUR)} />
                    </Form.Item>
                    <Form.Item label="Hands per Hour">
                        <InputNumber defaultValue={DEFAULT_NUM_HANDS_PER_HOUR} min={1} onChange={(value) => setNumHandsPerHour(value ?? DEFAULT_NUM_HANDS_PER_HOUR)} />
                    </Form.Item>
                    <Form.Item label="NLH Minimum Qualifying Hand:">
                        <Input defaultValue="22233" onChange={(e) => setNlhMinimumQualifier(e.target.value)} style={{ width: '80%' }} />
                    </Form.Item>
                    <Form.Item label="PLO Minimum Qualifying Hand:">
                        <Input defaultValue="22233" onChange={(e) => setPloMinimumQualifier(e.target.value)} style={{ width: '80%' }} />
                    </Form.Item>
                    <Form.Item label="PLO Must Flop High Hand?" valuePropName="checked">
                        <Switch defaultChecked={true} onChange={(checked) => setNoPloFlopRestriction(!checked)} />
                    </Form.Item>
                    <Form.Item label="Optional Phone Number for SMS:">
                        <Input onChange={(e) => setNotifPhoneNumber(e.target.value)} style={{ width: '30%', backgroundColor: 'white', borderRadius: 6 }} addonBefore="+1 " />
                    </Form.Item>
                    <Form.Item style={{ width: '100%' }}>
                        <Button onClick={handleStartSimulation} loading={loading}>Run Simulation</Button>
                    </Form.Item>
                    {error && <p style={{ color: '#ff6b6b', textAlign: 'center' }}>{error}</p>}
                </Form>
            )}

            {!isModalOpen && (
                <div>
                    {!isSimulationDone && (
                        <div style={{padding: '30px 50px'}}>
                            <h2 className="p2">Simulation In Progress</h2>
                            <Progress
                                percent={progressPercent}
                                status="active"
                                strokeColor="#38b32f"
                                style={{ maxWidth: 600, margin: '0 auto' }}
                            />
                            <p style={{ marginTop: 10, color: '#ccc' }}>
                                {handsCompleted.toLocaleString()} / {totalHands.toLocaleString()} hands completed
                            </p>
                        </div>
                    )}

                    {isSimulationDone && (
                        <div style={{padding: '10px 50px'}}>
                            <h2 className="p2" style={{color: '#38b32f'}}>Simulation Complete</h2>
                        </div>
                    )}

                    <div style={{paddingTop: 20, display: 'flex', justifyContent: 'center', gap: 10}}>
                        {canPlayHand && (
                            <Button onClick={handleProceed} loading={loading} size="large">
                                Play Hand {handNum + 2 <= totalHands ? `(#${handNum + 2})` : ''}
                            </Button>
                        )}
                        <Button onClick={handleStartNewSimulation} size="large">Start New Simulation</Button>
                    </div>

                    {error && <p style={{ color: '#ff6b6b', marginTop: 10 }}>{error}</p>}

                    {handNum >= 0 && (
                        <p style={{ marginTop: 5, color: '#999' }}>
                            Viewing hand {handNum + 1} of {totalHands.toLocaleString()}
                        </p>
                    )}

                    {gameState && (
                        <div>
                            <div className="high-hand-container">
                                <div className="high-hand-board">
                                    <h2>High Hand</h2>
                                    <div className="high-hand-cards">
                                        {gameState.highHandSnapshot && gameState.highHandSnapshot.highHand ? (
                                            gameState.highHandSnapshot.highHand.map((card, index) => (
                                                <div key={index} className="high-hand-card">
                                                    {renderCard(card)}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="no-high-hand">No High Hand Yet</div>
                                        )}
                                    </div>
                                    <div className="table-id">
                                        Table ID: {gameState.highHandSnapshot?.tableID || "N/A"}
                                    </div>
                                </div>

                                <div className="stats">
                                    <div className="plo-win-percentage">
                                        PLO Win %: {calculateWinPercentage(gameState.statsSnapshot.numPloWins, gameState.statsSnapshot.numHighHands)}%
                                    </div>
                                    <div className="nlh-win-percentage">
                                        NLH Win %: {calculateWinPercentage(gameState.statsSnapshot.numHoldEmWins, gameState.statsSnapshot.numHighHands)}%
                                    </div>
                                    <div className="high-hands-count">
                                        Total High Hands: {gameState.statsSnapshot.numHighHands || 0}
                                    </div>
                                </div>
                            </div>

                            <div className="tables-container">
                                {Object.keys(gameState.tableIdToSnapshot).map((tableId) => {
                                    const tableData = gameState.tableIdToSnapshot[tableId];
                                    return (
                                        <PokerTable
                                            key={tableId}
                                            tableData={tableData}
                                            tableNumber={tableId}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default App;
