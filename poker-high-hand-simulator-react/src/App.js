import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './App.css';
import axios from 'axios';
import { PokerTable, renderCard } from './PokerTable';
import { Button, Form, Input, InputNumber, Switch, Progress, ConfigProvider, Collapse } from "antd";

export const DEFAULT_NUM_PLO = 8;
export const DEFAULT_NUM_NLH = 8;
export const DEFAULT_NUM_PLAYERS = 8;
export const DEFAULT_SIM_DUR = 100;
export const DEFAULT_NUM_HANDS_PER_HOUR = 30;

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://s3kbllcc5g.execute-api.us-east-1.amazonaws.com';

const antdTheme = {
    token: {
        colorPrimary: '#d4af37',
        borderRadius: 8,
        fontFamily: "'Poppins', sans-serif",
    },
};

const SPEED_MAP = { 1: 2000, 5: 400, 25: 80, 100: 10, 999: 1 };

const App = () => {
    const [showResearch, setShowResearch] = useState(false);
    const [simulationId, setSimulationId] = useState(null);
    const [gameState, setGameState] = useState(null);
    const [handNum, setHandNum] = useState(-1);
    const [isSimulationDone, setIsSimulationDone] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const [handsCompleted, setHandsCompleted] = useState(0);
    const [totalHands, setTotalHands] = useState(0);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    // Auto-play state
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    const [ploMinimumQualifier, setPloMinimumQualifier] = useState("22233");
    const [nlhMinimumQualifier, setNlhMinimumQualifier] = useState("22233");
    const [numHandsPerHour, setNumHandsPerHour] = useState(DEFAULT_NUM_HANDS_PER_HOUR);
    const [numPLOTables, setNumPLOTables] = useState(DEFAULT_NUM_PLO);
    const [numNLHTables, setNumNLHTables] = useState(DEFAULT_NUM_NLH);
    const [seatsPerTable, setSeatsPerTable] = useState(DEFAULT_NUM_PLAYERS);
    const [simulationDuration, setSimulationDuration] = useState(DEFAULT_SIM_DUR);
    const [noPloFlopRestriction, setNoPloFlopRestriction] = useState(false);

    // Snapshot of params the current simulation was started with
    const [simParams, setSimParams] = useState(null);

    // Refs for auto-play to avoid stale closures
    const handNumRef = useRef(handNum);
    const handsCompletedRef = useRef(handsCompleted);
    const isSimulationDoneRef = useRef(isSimulationDone);
    const loadingRef = useRef(loading);
    const simulationIdRef = useRef(simulationId);
    const totalHandsRef = useRef(totalHands);

    handNumRef.current = handNum;
    handsCompletedRef.current = handsCompleted;
    isSimulationDoneRef.current = isSimulationDone;
    loadingRef.current = loading;
    simulationIdRef.current = simulationId;
    totalHandsRef.current = totalHands;

    const hasSimulation = !!simulationId;

    const calculateWinPercentage = (wins, totalHours) => {
        return totalHours > 0 ? ((wins / totalHours) * 100).toFixed(2) : 0;
    };

    // Compute integer table IDs from sorted UUID keys
    const tableIdMap = useMemo(() => {
        if (!gameState || !gameState.tableIdToSnapshot) return {};
        const sortedKeys = Object.keys(gameState.tableIdToSnapshot).sort();
        const map = {};
        sortedKeys.forEach((uuid, index) => {
            map[uuid] = index + 1;
        });
        return map;
    }, [gameState]);

    // Find ALL qualifying tables with their seat numbers
    const qualifyingTables = useMemo(() => {
        if (!gameState?.tableIdToSnapshot || !gameState?.highHandSnapshot?.highHand) return [];
        const hhCardStrs = new Set(gameState.highHandSnapshot.highHand.map(c => c.strRepr));
        const results = [];
        const sortedKeys = Object.keys(gameState.tableIdToSnapshot).sort();
        sortedKeys.forEach((tableId) => {
            const tableData = gameState.tableIdToSnapshot[tableId];
            if (!tableData.qualifiesForHighHand) return;
            // Find best-matching seat
            let bestSeat = null;
            let bestMatches = 0;
            tableData.playerCards.forEach((playerCards, index) => {
                const matches = playerCards.filter(c => hhCardStrs.has(c.strRepr)).length;
                if (matches > bestMatches) {
                    bestMatches = matches;
                    bestSeat = index + 1;
                }
            });
            results.push({
                tableId,
                tableNumber: tableIdMap[tableId] || '?',
                isPlo: tableData.plo,
                seatNumber: bestSeat,
                isWinner: tableId === gameState.highHandSnapshot.tableID,
            });
        });
        // Put the winning table first
        results.sort((a, b) => (b.isWinner ? 1 : 0) - (a.isWinner ? 1 : 0));
        return results;
    }, [gameState, tableIdMap]);

    const handleStartSimulation = async () => {
        // Reset previous simulation state
        setIsAutoPlaying(false);
        setPlaybackSpeed(1);
        setGameState(null);
        setHandNum(-1);
        setIsSimulationDone(false);
        setIsPolling(false);
        setHandsCompleted(0);

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
            });
            setSimulationId(response.data);
            setTotalHands(simulationDuration * numHandsPerHour);
            setSimParams({
                numNLHTables, numPLOTables, seatsPerTable, numHandsPerHour,
                simulationDuration, nlhMinimumQualifier, ploMinimumQualifier,
                noPloFlopRestriction,
            });
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

    const handleProceed = useCallback(async () => {
        if (loadingRef.current) return; // guard against stacked calls

        const nextHandNum = handNumRef.current + 1;
        if (!isSimulationDoneRef.current && nextHandNum >= handsCompletedRef.current) {
            setError(`Hand ${nextHandNum + 1} is not yet simulated. ${handsCompletedRef.current} of ${totalHandsRef.current} hands completed so far.`);
            setIsAutoPlaying(false);
            return;
        }
        if (nextHandNum >= totalHandsRef.current) {
            setIsAutoPlaying(false);
            return;
        }
        try {
            setError(null);
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/simulations/${simulationIdRef.current}/hands/${nextHandNum}`);
            setHandNum(nextHandNum);
            setGameState(response.data);
        } catch (err) {
            console.error("Error fetching hand:", err);
            setError("Failed to fetch hand data.");
            setIsAutoPlaying(false);
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-play effect
    useEffect(() => {
        if (!isAutoPlaying) return;

        const intervalMs = SPEED_MAP[playbackSpeed] || 2000;
        const interval = setInterval(() => {
            handleProceed();
        }, intervalMs);

        return () => clearInterval(interval);
    }, [isAutoPlaying, playbackSpeed, handleProceed]);

    const toggleAutoPlay = () => {
        setIsAutoPlaying(prev => !prev);
    };

    const progressPercent = totalHands > 0 ? Math.round((handsCompleted / totalHands) * 100) : 0;
    const canPlayHand = simulationId && (handsCompleted > 0 || isSimulationDone);

    // Research page overlay
    if (showResearch) {
        return (
            <ConfigProvider theme={antdTheme}>
                <div className="app-container">
                    <div className="header">
                        <div className="header-suits">
                            <span className="suit-dark">&#9824;</span>{' '}
                            <span className="suit-red">&#9829;</span>{' '}
                            <span className="suit-red">&#9830;</span>{' '}
                            <span className="suit-dark">&#9827;</span>
                        </div>
                        <h1 className="header-title">Poker High Hand Simulator</h1>
                        <div className="header-divider" />
                    </div>
                    <div className="research-page">
                        <div className="research-wip">
                            <div className="research-wip-icon">&#128300;</div>
                            <h2 className="research-wip-title">Research Hub</h2>
                            <p className="research-wip-desc">
                                Deep-dive analytics on high hand promotion fairness, optimal qualifier thresholds,
                                and PLO vs NLH win-rate distributions coming soon.
                            </p>
                            <div className="research-wip-badge">WORK IN PROGRESS</div>
                            <button className="btn-research-back" onClick={() => setShowResearch(false)}>
                                &#8592; Back
                            </button>
                        </div>
                    </div>
                </div>
            </ConfigProvider>
        );
    }

    return (
        <ConfigProvider theme={antdTheme}>
            <div className="app-container">
                {/* Header */}
                <div className="header">
                    <div className="header-suits">
                        <span className="suit-dark">&#9824;</span>{' '}
                        <span className="suit-red">&#9829;</span>{' '}
                        <span className="suit-red">&#9830;</span>{' '}
                        <span className="suit-dark">&#9827;</span>
                    </div>
                    <h1 className="header-title">Poker High Hand Simulator</h1>
                    <div className="header-divider" />
                </div>

                {/* Intro - only before first simulation */}
                {!hasSimulation && (
                    <>
                        <img className="hero-image" src={require('./cards.png')} alt="cards" />
                        <div className="intro-section">
                            <div className="intro-card">
                                Poker rooms use <strong>High Hand promotions</strong> to attract Texas Hold 'Em (NLH) and Pot Limit Omaha (PLO) players.
                                The player with the best poker hand during a set period wins a cash prize.
                                The challenge: PLO and NLH have very different odds of making strong hands,
                                so finding a <strong>fair promotion structure</strong> is non-trivial.
                            </div>
                            <div className="intro-card">
                                This simulator runs thousands of hands across NLH and PLO tables, tracking which game type
                                wins the high hand each hour. Configure the parameters below and see the results in real time.
                            </div>
                        </div>
                    </>
                )}

                {/* Config Form - full form before sim, params bar + collapsible restart during sim */}
                {!hasSimulation ? (
                    <>
                        <div className="config-card">
                            <div className="config-title">SIMULATION SETTINGS</div>
                            <div className="config-title-divider" />
                            <Form labelCol={{ span: 10 }} wrapperCol={{ span: 14 }} labelAlign="left">
                                <Form.Item label="NLH Tables">
                                    <InputNumber defaultValue={DEFAULT_NUM_NLH} min={0} onChange={(v) => setNumNLHTables(v ?? DEFAULT_NUM_NLH)} style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item label="PLO Tables">
                                    <InputNumber defaultValue={DEFAULT_NUM_PLO} min={0} onChange={(v) => setNumPLOTables(v ?? DEFAULT_NUM_PLO)} style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item label="Players per Table">
                                    <InputNumber defaultValue={DEFAULT_NUM_PLAYERS} min={2} max={10} onChange={(v) => setSeatsPerTable(v ?? DEFAULT_NUM_PLAYERS)} style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item label="Hands per Hour">
                                    <InputNumber defaultValue={DEFAULT_NUM_HANDS_PER_HOUR} min={1} onChange={(v) => setNumHandsPerHour(v ?? DEFAULT_NUM_HANDS_PER_HOUR)} style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item label="Duration (hours)">
                                    <InputNumber defaultValue={DEFAULT_SIM_DUR} min={1} onChange={(v) => setSimulationDuration(v ?? DEFAULT_SIM_DUR)} style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item label="NLH Min Qualifier">
                                    <Input defaultValue="22233" onChange={(e) => setNlhMinimumQualifier(e.target.value)} placeholder="e.g. AAAKK" />
                                </Form.Item>
                                <Form.Item label="PLO Min Qualifier">
                                    <Input defaultValue="22233" onChange={(e) => setPloMinimumQualifier(e.target.value)} placeholder="e.g. AAAKK" />
                                </Form.Item>
                                <Form.Item label="PLO Must Flop HH?" valuePropName="checked">
                                    <Switch defaultChecked={true} onChange={(checked) => setNoPloFlopRestriction(!checked)} />
                                </Form.Item>
                                <Form.Item wrapperCol={{ offset: 0, span: 24 }} style={{ textAlign: 'center', marginTop: 24, marginBottom: 0 }}>
                                    <Button className="btn-gold btn-gold-pulse" onClick={handleStartSimulation} loading={loading}>
                                        RUN SIMULATION
                                    </Button>
                                </Form.Item>
                                {error && <div className="error-message">{error}</div>}
                            </Form>
                        </div>
                        <div style={{ marginTop: 32 }}>
                            <button className="btn-research" onClick={() => setShowResearch(true)}>
                                <span className="research-icon">&#128300;</span> View Research
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="sim-params-bar">
                        {simParams && (
                            <div className="sim-params-pills">
                                <span className="param-pill"><strong>{simParams.numNLHTables}</strong> NLH</span>
                                <span className="param-pill"><strong>{simParams.numPLOTables}</strong> PLO</span>
                                <span className="param-pill"><strong>{simParams.seatsPerTable}</strong> seats</span>
                                <span className="param-pill"><strong>{simParams.numHandsPerHour}</strong> hands/hr</span>
                                <span className="param-pill"><strong>{simParams.simulationDuration}</strong> hrs</span>
                                <span className="param-pill">NLH min: <strong>{simParams.nlhMinimumQualifier}</strong></span>
                                <span className="param-pill">PLO min: <strong>{simParams.ploMinimumQualifier}</strong></span>
                                {!simParams.noPloFlopRestriction && <span className="param-pill">PLO must flop</span>}
                            </div>
                        )}
                        <div className="sim-params-actions">
                            <Button className="btn-restart" onClick={handleStartSimulation} loading={loading}>
                                RESTART SIMULATION
                            </Button>
                            <button className="btn-research btn-research-small" onClick={() => setShowResearch(true)}>
                                <span className="research-icon">&#128300;</span> Research
                            </button>
                        </div>
                    </div>
                )}

                {/* Simulation View - below config when active */}
                {hasSimulation && (
                    <div className="simulation-section">
                        {/* Progress */}
                        {!isSimulationDone && (
                            <div className="progress-section">
                                <div className="progress-title">SIMULATION IN PROGRESS</div>
                                <div className="progress-bar-wrapper">
                                    <Progress
                                        percent={progressPercent}
                                        status="active"
                                        strokeColor={{ from: '#1a6b3c', to: '#d4af37' }}
                                        trailColor="#1a1f2e"
                                        size={[null, 14]}
                                    />
                                </div>
                                <div className="progress-hands">
                                    {handsCompleted.toLocaleString()} / {totalHands.toLocaleString()} hands
                                </div>
                            </div>
                        )}

                        {isSimulationDone && (
                            <div style={{ padding: '20px 0' }}>
                                <div className="complete-badge">&#9733; SIMULATION COMPLETE</div>
                            </div>
                        )}

                        {/* Controls */}
                        <div className="controls-section">
                            {canPlayHand && !isAutoPlaying && (
                                <Button className="btn-primary" onClick={handleProceed} loading={loading}>
                                    Play Hand {handNum + 2 <= totalHands ? `#${handNum + 2}` : ''}
                                </Button>
                            )}

                            {canPlayHand && (
                                <>
                                    <Button
                                        className={isAutoPlaying ? 'btn-pause' : 'btn-play'}
                                        onClick={toggleAutoPlay}
                                    >
                                        {isAutoPlaying ? '⏸ Pause' : '▶ Auto-Play'}
                                    </Button>

                                    <div className="speed-selector">
                                        {[[1,'1x'], [5,'5x'], [25,'25x'], [100,'100x'], [999,'MAX']].map(([speed, label]) => (
                                            <button
                                                key={speed}
                                                className={`speed-btn ${playbackSpeed === speed ? 'active' : ''}`}
                                                onClick={() => setPlaybackSpeed(speed)}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}

                        </div>

                        {error && <div className="error-message">{error}</div>}

                        {handNum >= 0 && (
                            <div className="hand-info">
                                Viewing hand {(handNum + 1).toLocaleString()} of {totalHands.toLocaleString()}
                            </div>
                        )}

                        {/* Dashboard: High Hand + Stats */}
                        {gameState && (
                            <>
                                <div className="dashboard">
                                    <div className="high-hand-panel">
                                        <div className="panel-title">&#9813; HIGH HAND</div>
                                        <div className="high-hand-cards">
                                            {gameState.highHandSnapshot && gameState.highHandSnapshot.highHand ? (
                                                gameState.highHandSnapshot.highHand.map((card, index) => (
                                                    <span key={index}>{renderCard(card)}</span>
                                                ))
                                            ) : (
                                                <div className="no-high-hand">No qualifying hand this hour</div>
                                            )}
                                        </div>
                                        <div className="high-hand-qualifiers">
                                            {qualifyingTables.length > 0 ? (
                                                (() => {
                                                    const qt = qualifyingTables[0];
                                                    return (
                                                        <div className="hh-qualifier-row winner">
                                                            <span className="hh-winner-star">&#9733;</span>
                                                            <span className={`hh-table-badge ${qt.isPlo ? 'plo' : 'nlh'}`}>
                                                                {qt.isPlo ? 'PLO' : 'NLH'}
                                                            </span>
                                                            <span className="hh-qualifier-text">Table {qt.tableNumber}</span>
                                                            {qt.seatNumber && (
                                                                <span className="hh-seat-badge">Seat {qt.seatNumber}</span>
                                                            )}
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <div className="hh-qualifier-row">N/A</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="stats-panel">
                                        <div className="panel-title">STATISTICS</div>
                                        <div className="stat-item">
                                            <div className="stat-label">PLO Wins</div>
                                            <div className="stat-value plo">
                                                {calculateWinPercentage(gameState.statsSnapshot.numPloWins, gameState.statsSnapshot.numHighHands)}
                                                <span className="stat-suffix">%</span>
                                            </div>
                                        </div>
                                        <div className="stat-item">
                                            <div className="stat-label">NLH Wins</div>
                                            <div className="stat-value nlh">
                                                {calculateWinPercentage(gameState.statsSnapshot.numHoldEmWins, gameState.statsSnapshot.numHighHands)}
                                                <span className="stat-suffix">%</span>
                                            </div>
                                        </div>
                                        <div className="stat-item">
                                            <div className="stat-label">Total High Hands</div>
                                            <div className="stat-value total">{gameState.statsSnapshot.numHighHands || 0}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tables */}
                                <div className="tables-section-title">POKER ROOM</div>
                                <div className="tables-container">
                                    {Object.keys(gameState.tableIdToSnapshot).sort().map((tableId) => {
                                        const tableData = gameState.tableIdToSnapshot[tableId];
                                        return (
                                            <PokerTable
                                                key={tableId}
                                                tableData={tableData}
                                                tableNumber={tableIdMap[tableId] || 0}
                                                isHighHandTable={gameState.highHandSnapshot?.tableID === tableId}
                                            />
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </ConfigProvider>
    );
};

export default App;
