import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import axios from 'axios';
import { PokerTable, renderCard}  from './PokerTable';
import HighHandBoard from './HighHandBoard';
import {wait} from "@testing-library/user-event/dist/utils";

const App = () => {


    const calculateWinPercentage = (wins, totalHours) => {
        return totalHours > 0 ? ((wins / totalHours) * 100).toFixed(2) : 0;
    };


    const [isModalOpen, setIsModalOpen] = useState(true);
    const [simulationId, setSimulationId] = useState(null);
    const [gameState, setGameState] = useState(null);
    const [handNum, setHandNum] = useState(-1);
    const [isSimulationDone, setIsSimulationDone] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const [isFastForward, setIsFastForward] = useState(false);
    const fastForwardIntervalRef = useRef(null);


    const [ploMinimumQualifier, setPloMinimumQualifier] = useState("22233");
    const [nlhMinimumQualifier, setNlhMinimumQualifier] = useState("22233");
    const [numHandsPerHour, setNumHandsPerH] = useState(100);
    const [numPLOTables, setNumPLOTables] = useState(4);
    const [numNLHTables, setNumNLHTables] = useState(4);
    const [seatsPerTable, setSeatsPerTable] = useState(4);
    const [simulationDuration, setSimulationDuration] = useState(10);
    const [noPloFlopRestriction, setPloflop] = useState(false);

    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://ec2-35-85-34-37.us-west-2.compute.amazonaws.com:8080'


    const handleStartSimulation = async () => {
        try {
            const response = await axios.post(`${API_BASE_URL}/api/simulations/start`, {
                numNlhTables: numNLHTables,
                numPloTables: numPLOTables,
                numPlayersPerTable: seatsPerTable,
                numHandsPerHour: numHandsPerHour,
                simulationDuration: simulationDuration,
                nlhMinimumQualifyingHand: nlhMinimumQualifier,
                ploMinimumQualifyingHand: ploMinimumQualifier,
                noPloFlopRestriction: noPloFlopRestriction
            });
            setSimulationId(response.data);
            setIsModalOpen(false);
            setIsPolling(true);
        } catch (error) {
            console.error("Error starting simulation:", error);
        }
    };


    useEffect(() => {
        const pollSimulationStatus = async () => {
            if (!isPolling || !simulationId) return;

            try {
                const response = await axios.get(`${API_BASE_URL}/api/simulations/${simulationId}/status`);
                if (response.data === 'DONE') {
                    setIsPolling(false);
                    setIsSimulationDone(true);
                }
            } catch (error) {
                console.error("Error polling simulation status:", error);
            }
        };

        const interval = setInterval(pollSimulationStatus, 2000);
        return () => clearInterval(interval);
    }, [isPolling, simulationId]);


    const handleProceed = async () => {
        try {
            const nextHandNum = handNum + 1;
            setHandNum(nextHandNum);
            const response = await axios.get(`${API_BASE_URL}/api/simulations/${simulationId}/hands/${nextHandNum}`);
            setGameState(response.data);
        } catch (error) {
            console.error("Error fetching next hand:", error);
        }
    };
    //
    //
    //
    // const handleFF = async () => {
    //     setIsFastForward(true);
    //
    //    while (isFastForward) {
    //        try {
    //            const nextHandNum = handNum + 1;
    //            setHandNum(nextHandNum);
    //            const response = await axios.get(`${API_BASE_URL}/api/simulations/${simulationId}/hands/${nextHandNum}`);
    //            setGameState(response.data);
    //        } catch (error) {
    //            console.error("Error fetching next hand:", error);
    //        }
    //    }
    // };
    //

    const handleStop = () => {
        setIsFastForward(false);
        if (fastForwardIntervalRef.current) {
            clearInterval(fastForwardIntervalRef.current);
            fastForwardIntervalRef.current = null;
        }
    };




    const handleStartNewSimulation = () => {
        setIsModalOpen(true);
        setSimulationId(null);
        setGameState(null);
        setHandNum(-1);
        setIsSimulationDone(false);
        setIsPolling(false);
    };


    const handlePLOChange = (e) => setNumPLOTables(parseInt(e.target.value));
    const handleNLHChange = (e) => setNumNLHTables(parseInt(e.target.value));
    const handleSeatsChange = (e) => setSeatsPerTable(parseInt(e.target.value));
    const handlePLOQualChange = (e) => setPloMinimumQualifier(e.target.value);
    const handleNlhQualChange = (e) => setNlhMinimumQualifier(e.target.value);
    const handNumHandsPerH = (e) => setNumHandsPerH(e.target.value);
    const handSimulationDuartion = (e) => setSimulationDuration(e.target.value);
    const handlePloFlop = (e) => setPloflop(e.target.value);

    return (
        <div>
            <h1>Poker High Hand Simulator</h1>

                        {isModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <h2>Set Simulation Parameters</h2>
                        <label>
                            Number of NLH Tables:
                            <input type="number" value={numNLHTables} defaultValue={4}
                                   onChange={handleNLHChange}/>
                        </label>
                        <label>
                            Number of PLO Tables:
                            <input type="number" value={numPLOTables} defaultValue={4}
                                   onChange={handlePLOChange}/>
                        </label>
                        <label>
                            Players per Table:
                            <input type="number" value={seatsPerTable} defaultValue={4}
                                   onChange={handleSeatsChange}/>
                        </label>
                        <label>
                            Simulation Duration (hours):
                            <input type="number" value={simulationDuration} defaultValue={10}
                                   onChange={handSimulationDuartion}/>
                        </label>
                        <label>
                            NLH Minimum Qualifying Hand:
                            <input type="text" value={nlhMinimumQualifier}
                                   onChange={handleNlhQualChange}/>
                        </label>
                        <label>
                            PLO Minimum Qualifying Hand:
                            <input type="text" value={ploMinimumQualifier}
                                   onChange={handlePLOQualChange}/>
                        </label>
                        <label>
                            No PLO Flop Restriction:
                            <input type="checkbox" checked={noPloFlopRestriction}
                                   onChange={handlePloFlop}/>
                        </label>
                        <button onClick={handleStartSimulation}>Run Simulation</button>
                    </div>
                </div>
                        )}

            {/*{isSimulationDone && (*/}
            {/*    <div>*/}
            {/*        <button onClick={handleFF}>Fast Forward</button>*/}
            {/*    </div>*/}
            {/*)}*/}
            {/*{isSimulationDone && isFastForward && (*/}
            {/*    <div>*/}
            {/*        <button onClick={handleStop}>Stop</button>*/}
            {/*    </div>*/}
            {/*)}*/}
            {isSimulationDone && (
                <div>
                    <button onClick={handleProceed} disabled={isFastForward}>Play Hand</button>
                </div>
            )}
            {isSimulationDone && (
                <div>
                    <button onClick={handleStartNewSimulation}>Start New Simulation</button>
                </div>
            )}

            {!isModalOpen && (
                <div>
                    {!isSimulationDone ? (
                        <h2>Simulation In Progress</h2>
                    ) : <h2></h2>
                    }

                    {!isSimulationDone && (
                        <div>
                            <div className="video-container">
                                <iframe
                                    width="1000"
                                    height="600"
                                    src="https://www.youtube.com/embed/9lHQN6rS1Z0?autoplay=1"
                                    title="YouTube video player"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        </div>
                    )}

                    {gameState ? (
                        <div>
                            <div>
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
                                            <div className="no-high-hand">No High Hand Available</div>
                                        )}
                                    </div>
                                    <div className="table-id">
                                        Table ID: {gameState.highHandSnapshot?.tableID || "N/A"}
                                    </div>
                                    <div className="stats">
                                        <div className="plo-win-percentage">
                                            PLO Win
                                            %: {calculateWinPercentage(gameState.statsSnapshot.numPloWins, gameState.statsSnapshot.numHighHands)}%
                                        </div>
                                        <div className="nlh-win-percentage">
                                            NLH Win
                                            %: {calculateWinPercentage(gameState.statsSnapshot.numHoldEmWins, gameState.statsSnapshot.numHighHands)}%
                                        </div>
                                        <div className="high-hands-count">
                                            Total High Hands: {gameState.statsSnapshot.numHighHands || 0}
                                        </div>
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
                    ) : (
                        <div></div>
                    )}
                </div>
            )}
        </div>
    );
};

export default App;
