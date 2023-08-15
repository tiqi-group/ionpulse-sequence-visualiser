import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import InputGroup from 'react-bootstrap/InputGroup';
import Button from 'react-bootstrap/Button';
import {Component} from 'react';

class IpPort extends Component {
    
    constructor(props){
        super(props);
        this.props = props
        this.state = {ip: "", port: ""};
        this.onClick = this.onClick.bind(this);
        this.handleIpChange = this.handleIpChange.bind(this);
        this.handlePortChange = this.handlePortChange.bind(this);

        //this.handler = props.handler;
    };

    handleIpChange(e){
        // console.log(e.target.value)
        this.setState({ip: e.target.value});
    }
    handlePortChange(e){
        this.setState({port: e.target.value});
    }
        
    onClick(){
        // console.log(this.state.ip, this.state.port)
        this.props.handler(this.state.ip, this.state.port)
    }

    render() {
        return (
        <Form>
        <Row>
            <Col> 
            <InputGroup className="mb-3">
                <InputGroup.Text id = "ip">IP address </InputGroup.Text> 
            <Form.Control name="ip" value={this.state.ip} onChange={this.handleIpChange}/>
            </InputGroup>
            </Col>
            <Col> 
                <InputGroup className="mb-3">
                <InputGroup.Text id = "port">Port</InputGroup.Text> 
            <Form.Control name="port" value={this.state.port} onChange={this.handlePortChange}/>
            </InputGroup>
            </Col>
            <Col>
            <Button variant="primary" onClick = {this.onClick}>
            Submit
            </Button>
            </Col>
        </Row>
        </Form>
        )
    }
}

// function IpPort(props){
// }

export {IpPort};