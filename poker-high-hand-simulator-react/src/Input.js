import './index.css'
import { DEFAULT_NUM_PLO, DEFAULT_NUM_NLH, DEFAULT_NUM_PLAYERS, DEFAULT_SIM_DUR} from './App'

import {
    Button,
    DatePicker,
    Form,
    Input,
    InputNumber,
    Switch,
} from 'antd';
const FormDisabledDemo = () => {
    return (
        <>
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
            //    onFinish={handleStartSimulation}
            >

                <Form.Item label="Number NLH Tables">
                    <InputNumber defaultValue={DEFAULT_NUM_NLH}/>
                </Form.Item>
                <Form.Item label="Number PLO Tables">
                    <InputNumber defaultValue={DEFAULT_NUM_PLO}/>
                </Form.Item>
                <Form.Item label="Players per Table">
                    <InputNumber defaultValue={DEFAULT_NUM_PLAYERS}/>
                </Form.Item>
                <Form.Item label="Simulation Duration">
                    <InputNumber defaultValue={DEFAULT_SIM_DUR}/>
                </Form.Item>

                <Form.Item label="NLH Minimum Qualifying Hand:">
                    <Input    style={{
                        width: '80%',
                    }} defaultValue="22233" ></Input>
                </Form.Item>
                    <Form.Item label="PLO Minimum Qualifying Hand:">
                        <Input    style={{
                            width: '80%',
                        }} defaultValue="22233" ></Input>
                    </Form.Item>
                <Form.Item label="PLO Must Flop High Hand?" valuePropName="checked">
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
                <Form.Item style={{
                    width: '100%',
                }} >
                    <Button>Run Simulation</Button>
                </Form.Item>
            </Form>
        </>
    );
};

export default FormDisabledDemo;
