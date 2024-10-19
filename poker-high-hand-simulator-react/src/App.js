import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import axios from 'axios';
import { PokerTable, renderCard}  from './PokerTable';
import {Button, Form, Input, InputNumber, Switch, Spin} from "antd";
import WordArt from "react-wordart";
import FormItem from "antd/es/form/FormItem";

export const DEFAULT_NUM_PLO = 8;
export const DEFAULT_NUM_NLH = 8;
export const DEFAULT_NUM_PLAYERS = 8;
export const DEFAULT_SIM_DUR = 100;
export const DEFAULT_NUM_HANDS_PER_HOUR = 30;

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
    const [numHandsPerHour, setNumHandsPerH] = useState(DEFAULT_NUM_HANDS_PER_HOUR);
    const [numPLOTables, setNumPLOTables] = useState(DEFAULT_NUM_PLO);
    const [numNLHTables, setNumNLHTables] = useState(DEFAULT_NUM_NLH);
    const [seatsPerTable, setSeatsPerTable] = useState(DEFAULT_NUM_PLAYERS);
    const [simulationDuration, setSimulationDuration] = useState(DEFAULT_SIM_DUR);
    const [noPloFlopRestriction, setPloflop] = useState(false);
    const [notifPhoneNumber, setNotifPhoneNumber] = useState(null);

    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080'

    const handleStartSimulation = async () => {
        try {
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
                const response = await axios.get(`${API_BASE_URL}/simulations/${simulationId}/status`);
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
            const response = await axios.get(`${API_BASE_URL}/simulations/${simulationId}/hands/${nextHandNum}`);
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
    //            const response = await axios.get(`${API_BASE_URL}/simulations/${simulationId}/hands/${nextHandNum}`);
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
    const handleNotifPhoneNumber = (e) => setNotifPhoneNumber(e.target.value);

    return (
        <div>
            <WordArt text='Poker High Hand Simulator' theme={`italicOutline`} fontSize={80} className="word-art"/>
            <img hidden={!isModalOpen} style={{width:"30%", height:'30%'}} src={require('./cards.png')} />

            <p hidden={!isModalOpen} className="p1">Poker rooms use High Hand promotions to attract Texas Hold 'Em (NLH) and Pot Limit Omaha (PLO) players. In these promotions, the player with the best ranked poker hand during a set period, usually an hour, wins a set monetary prize.
                To be eligible, players pay a rake taken from qualifying pots. The challenge arises because PLO and NLH have different odds of getting the strongest hands. Some poker rooms address this discrepancy by restricting PLO players from winning the HH unless their hand utilizes the first 3 community cards.
                This project aims to find a fair solution for HH promotions and quantify the fairness of different HH promotion configurations.</p>
                <p hidden={!isModalOpen} className="p1">This program allows the user to simulate HH promotions running at a poker room with NLH and PLO tables. The program plays through poker hands per table, stores qualifying HHs per period, and compares them to qualifying HHs from other tables during the same period. Once the simulation concludes, the program outputs the winning statistics per game type for the simulation duration.</p>
                <p hidden={!isModalOpen} className="p1">Input the simulation parameters below to run a simulation asynchronously. Add an optional phone number to consent to receive a SMS once the simulation concludes.</p>


            {isModalOpen && (
                <Form

                    labelCol={{
                        span: 5

                    }}
                    wrapperCol={{
                        span: 30,
                    }}
                    // layout="horizontal"
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

                    <Form.Item onChange={handleNLHChange} label="Number NLH Tables">
                        <InputNumber  defaultValue={DEFAULT_NUM_NLH}/>
                    </Form.Item>
                    <Form.Item  onChange={handlePLOChange} label="Number PLO Tables">
                        <InputNumber defaultValue={DEFAULT_NUM_PLO}/>
                    </Form.Item>
                    <Form.Item onChange={handleSeatsChange} label="Players per Table">
                        <InputNumber defaultValue={DEFAULT_NUM_PLAYERS}/>
                    </Form.Item>
                    <Form.Item onChange={handSimulationDuartion} label="Simulation Duration">
                        <InputNumber  defaultValue={DEFAULT_SIM_DUR}/>
                    </Form.Item>

                    <Form.Item  onChange={handleNlhQualChange} label="NLH Minimum Qualifying Hand:">
                        <Input   style={{
                            width: '80%',
                        }} defaultValue="22233" ></Input>
                    </Form.Item>
                    <Form.Item  onChange={handlePLOQualChange}  label="PLO Minimum Qualifying Hand:">
                        <Input style={{
                            width: '80%',
                        }} defaultValue="22233" ></Input>
                    </Form.Item>
                    <Form.Item label="PLO Must Flop High Hand?" onChange={handlePloFlop} valuePropName="checked">
                        <Switch defaultValue={true}/>
                    </Form.Item>
                    {/*<Form.Item label="Checkbox" name="disabled" valuePropName="checked">*/}
                    {/*    <Checkbox>Checkbox</Checkbox>*/}
                    {/*</Form.Item>*/}
                    {/*<Form.Item label="Radio">*/}
                    {/*    <Radio.Group>*/}
                    {/*        <Radio value="apple"> Apple </Radio>*/}
                    {/*        <Radio value="pear"> Pear </Radio>*/}
                    {/*    </Radio.Group>*/}
                    {/*</Form.Item>*/}
                    {/*<Form.Item label="Input">*/}
                    {/*    <Input />*/}
                    {/*</Form.Item>*/}
                    {/*<Form.Item label="Select" >*/}
                    {/*    <Select>*/}
                    {/*        <Select.Option value="demo">Demo</Select.Option>*/}
                    {/*    </Select>*/}
                    {/*</Form.Item>*/}
                    <FormItem onChange={handleNotifPhoneNumber}label="Optional Phone Number for SMS:">
                        <Input style={{
                            width: '30%',
                            backgroundColor: 'white',
                            borderRadius: 6
                        }} addonBefore="+1 "/>
                    </FormItem>
                    <Form.Item style={{
                        width: '100%',
                    }} >
                        <Button onClick={handleStartSimulation}>Run Simulation</Button>
                    </Form.Item>
                </Form>
            )

            }

            {/*{isModalOpen && (*/}
            {/*    <div className="modal">*/}
            {/*        <div className="modal-content">*/}
            {/*            <h2>Set Simulation Parameters</h2>*/}
            {/*            <label>*/}
            {/*                Number of NLH Tables:*/}
            {/*                <input type="number" value={numNLHTables} defaultValue={4}*/}
            {/*                       onChange={handleNLHChange}/>*/}
            {/*            </label>*/}
            {/*            <label>*/}
            {/*                Number of PLO Tables:*/}
            {/*                <input type="number" value={numPLOTables} defaultValue={4}*/}
            {/*                       onChange={handlePLOChange}/>*/}
            {/*            </label>*/}
            {/*            <label>*/}
            {/*                Players per Table:*/}
            {/*                <input type="number" value={seatsPerTable} defaultValue={4}*/}
            {/*                       onChange={handleSeatsChange}/>*/}
            {/*            </label>*/}
            {/*            <label>*/}
            {/*                Simulation Duration (hours):*/}
            {/*                <input type="number" value={simulationDuration} defaultValue={10}*/}
            {/*                       onChange={handSimulationDuartion}/>*/}
            {/*            </label>*/}
            {/*            <label>*/}
            {/*                NLH Minimum Qualifying Hand:*/}
            {/*                <input type="text" value={nlhMinimumQualifier}*/}
            {/*                       onChange={handleNlhQualChange}/>*/}
            {/*            </label>*/}
            {/*            <label>*/}
            {/*                PLO Minimum Qualifying Hand:*/}
            {/*                <input type="text" value={ploMinimumQualifier}*/}
            {/*                       onChange={handlePLOQualChange}/>*/}
            {/*            </label>*/}
            {/*            <label>*/}
            {/*                No PLO Flop Restriction:*/}
            {/*                <input type="checkbox" checked={noPloFlopRestriction}*/}
            {/*                       onChange={handlePloFlop}/>*/}
            {/*            </label>*/}
            {/*            <button onClick={handleStartSimulation}>Run Simulation</button>*/}
            {/*        </div>*/}
            {/*    </div>*/}
            {/*)}*/}

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
                <div style={{paddingTop:30}}>
                    <Button onClick={handleProceed} disabled={isFastForward}>Play Hand</Button>
                </div>
            )}
            {isSimulationDone && (
                <div  style={{paddingTop:10}}>
                    <Button onClick={handleStartNewSimulation}>Start New Simulation</Button>
                </div>
            )}

            {!isModalOpen && (
                <div>
                    {!isSimulationDone ? (
                        <div style={{padding: 50}}>
                        <h2 className={"p2"}>Simulation In Progress</h2>
                            <Spin size={"large"}></Spin>
                        </div>
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
                                                <div className="no-high-hand">No High Hand Available</div>
                                            )}
                                        </div>
                                        <div className="table-id">
                                            Table ID: {gameState.highHandSnapshot?.tableID || "N/A"}
                                        </div>
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
