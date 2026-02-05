import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './App.css';
import axios from 'axios';
import { PokerTable, renderCard } from './PokerTable';
import { Button, Form, Input, InputNumber, Switch, Progress, ConfigProvider } from "antd";

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

const SPEED_MAP = { 1: 2000, 2: 1000, 5: 400, 10: 200 };

const App = () => {
    const [currentPage, setCurrentPage] = useState('config'); // 'config' | 'simulation' | 'research'
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
    const [notifPhoneNumber, setNotifPhoneNumber] = useState(null);

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

    // Get the table type (PLO/NLH) for the high hand
    const highHandTableInfo = useMemo(() => {
        if (!gameState?.highHandSnapshot?.tableID || !gameState.tableIdToSnapshot) return null;
        const tableId = gameState.highHandSnapshot.tableID;
        const tableData = gameState.tableIdToSnapshot[tableId];
        if (!tableData) return null;
        return {
            tableNumber: tableIdMap[tableId] || '?',
            isPlo: tableData.plo,
        };
    }, [gameState, tableIdMap]);

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
            setCurrentPage('simulation');
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

    const handleStartNewSimulation = () => {
        setCurrentPage('config');
        setSimulationId(null);
        setGameState(null);
        setHandNum(-1);
        setIsSimulationDone(false);
        setIsPolling(false);
        setHandsCompleted(0);
        setTotalHands(0);
        setError(null);
        setIsAutoPlaying(false);
        setPlaybackSpeed(1);
    };

    const toggleAutoPlay = () => {
        setIsAutoPlaying(prev => !prev);
    };

    const progressPercent = totalHands > 0 ? Math.round((handsCompleted / totalHands) * 100) : 0;
    const canPlayHand = simulationId && (handsCompleted > 0 || isSimulationDone);

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

                {/* Landing / Config */}
                {currentPage === 'config' && (
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

                        <div className="config-card">
                            <div className="config-title">SIMULATION SETTINGS</div>
                            <div className="config-title-divider" />
                            <Form
                                labelCol={{ span: 10 }}
                                wrapperCol={{ span: 14 }}
                                labelAlign="left"
                            >
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
                                <Form.Item label="SMS Notification">
                                    <Input onChange={(e) => setNotifPhoneNumber(e.target.value)} placeholder="Optional" addonBefore="+1" />
                                </Form.Item>
                                <Form.Item wrapperCol={{ offset: 0, span: 24 }} style={{ textAlign: 'center', marginTop: 24 }}>
                                    <Button className="btn-gold btn-gold-pulse" onClick={handleStartSimulation} loading={loading}>
                                        RUN SIMULATION
                                    </Button>
                                </Form.Item>
                                {error && <div className="error-message">{error}</div>}
                            </Form>
                        </div>

                        <div style={{ marginTop: 32 }}>
                            <button className="btn-research" onClick={() => setCurrentPage('research')}>
                                <span className="research-icon">&#128300;</span> View Research
                            </button>
                        </div>
                    </>
                )}

                {/* Simulation View */}
                {currentPage === 'simulation' && (
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
                                        {[1, 2, 5, 10].map(speed => (
                                            <button
                                                key={speed}
                                                className={`speed-btn ${playbackSpeed === speed ? 'active' : ''}`}
                                                onClick={() => setPlaybackSpeed(speed)}
                                            >
                                                {speed}x
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}

                            <Button className="btn-secondary" onClick={handleStartNewSimulation}>
                                New Simulation
                            </Button>

                            <button className="btn-research btn-research-small" onClick={() => setCurrentPage('research')}>
                                <span className="research-icon">&#128300;</span> Research
                            </button>
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
                                        <div className="high-hand-table-id">
                                            {highHandTableInfo ? (
                                                <>
                                                    <span className={`hh-table-badge ${highHandTableInfo.isPlo ? 'plo' : 'nlh'}`}>
                                                        {highHandTableInfo.isPlo ? 'PLO' : 'NLH'}
                                                    </span>
                                                    {' '}Table {highHandTableInfo.tableNumber}
                                                </>
                                            ) : (
                                                'N/A'
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

                {/* Research Page */}
                {currentPage === 'research' && (
                    <div className="research-page">
                        <div className="research-wip">
                            <div className="research-wip-icon">&#128300;</div>
                            <h2 className="research-wip-title">Research Hub</h2>
                            <p className="research-wip-desc">
                                Deep-dive analytics on high hand promotion fairness, optimal qualifier thresholds,
                                and PLO vs NLH win-rate distributions coming soon.
                            </p>
                            <div className="research-wip-badge">WORK IN PROGRESS</div>
                            <button
                                className="btn-research-back"
                                onClick={() => setCurrentPage(simulationId ? 'simulation' : 'config')}
                            >
                                &#8592; Back
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </ConfigProvider>
    );
};

export default App;
