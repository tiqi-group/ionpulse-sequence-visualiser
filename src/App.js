import io  from 'socket.io-client';
import React, { useState } from "react";
import Plot from "react-plotly.js";
import { SingleTTLChannel, RFScope } from "./Channels";
import NavBar from './Header';
import EnablingGroupOff from './OffCanvas';
import Container from 'react-bootstrap/Container';
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import { Hardware } from './Hardware';

import {
  EnablingGroup
} from "./VisualiserConfiguration";

import {IpPort} from './Settings';
import settings from 'settings';

var RF = {};
var TTLs = {};
let rf_names_map ={}
let TTL_names_map ={}
let RF_input = {}


for (var i = 0; i <= 32; i++) {
  RF["RF" + i] = false;
  TTLs["TTL" + i] = false;
  rf_names_map["RF" + i] = "RF" + i;
  TTL_names_map["TTL" + i] = "TTL" + i;
  RF_input["RF" + i] = {freq: [0], phase: [0], amp: [0], time: [0]}
  RF_input["TTL" + i] ={time: [0], values: [0]}
}

RF_input["PMT0"] = {time: [0], values: [0]}

TTLs["TTL1"]= true
TTLs["TTL2"]= true
TTLs["TTL3"]= true
TTLs["TTL4"]= true
TTLs["TTL5"]= true


export default class App extends React.Component {
  constructor() {
    super();
    this.state = {
      // TTL_input: TTL_input,
      enabledChannels: {...RF, ...TTLs},
      RF_input: RF_input,
      aom_configuration: {},
      rf_names_map: rf_names_map,
      TTL_names_map: TTL_names_map
    };
    this.libraryIp = settings["Library ip"]
    this.libraryPort = settings["Library port"]
    this.handleTTLChange = this.handleTTLChange.bind(this);
    this.handleRFChange = this.handleRFChange.bind(this);
    this.createRFMap = this.createRFMap.bind(this);
    this.onNotify = this.onNotify.bind(this)
    let socket_url = `ws://${this.libraryIp}:${this.libraryPort}`
    this.socket = io(socket_url, {path: "/ws/socket.io/", transports: ['websocket']});
    this.socket.on('notify', (value) =>{
      //console.log(this.state.RF_input);
        // Extracting data from the notification
        if (value.data.name == "Hardware.scope_sequence"){
          this.setState({RF_input: JSON.parse(value.data.value)});
        }
      });
  };

  componentDidMount(){

    let hardware_url = `http://${this.libraryIp}:${this.libraryPort}/Hardware/aom_description`
    fetch(hardware_url).then(
      (response) => response.json()).then(
        (data) => {
          this.setState({aom_configuration: JSON.parse(data)})
          this.setState({rf_names_map: this.createRFMap(JSON.parse(data))})
        }
      );
  }

  onNotify(value) {

      if (value.data.name == "Hardware.scope_sequence"){
        this.setState({RF_input: JSON.parse(value.data.value)});
      }
    }

  createRFMap(aom_configuration){
    let RF_map = rf_names_map;
    let enabledRFs = RF;
    for (const [channel, value] of Object.entries(aom_configuration)){
      RF_map[channel] = value.name;
      enabledRFs[channel] = true;
      this.setState({enabledChannels: {...enabledRFs, ...TTLs}})
    }
    return RF_map;
  }
  
  handleIPPortChange(ip, port) {
    console.log(ip, port)
  }

  handleTTLChange(e) {
    this.state.enabledTTLs[e.name] = !this.state.enabledTTLs[e.name];
    this.setState(e);
    
  }

  handleRFChange(e) {
    this.state.enabledChannels[e.name] = !this.state.enabledChannels[e.name];
    this.setState(e);
  }

  render() {
    return (

      <body>
        <NavBar />
        {/* <Container fluid="sm">
          <IpPort handler = {this.handleIPPortChange}/>
        </Container> */}
        <Router>
        <Routes>
        <Route path="/main" element={
      <div>
        <EnablingGroupOff Enablers= {<EnablingGroup
          names_map={this.state.rf_names_map}
          names_map_TTL = {this.state.TTL_names_map}
          enabledChannels={this.state.enabledChannels}
          enabled_TTL_channels={this.state.enabledTTLs}
          onEvent={this.handleRFChange}
        />}/>

        <RFScope RF_input={this.state.RF_input}
         enabledChannels={this.state.enabledChannels}
         rf_names_map = {this.state.rf_names_map}
         TTL_names_map = {this.state.TTL_names_map}/>
      </div>
      }/>
      <Route path="/hardware" element= {<Hardware aomConfiguration = {this.state.aom_configuration}/>} />
      {/* </Route> */}
      </Routes>
      </Router>
      </body>
    );
  }
}
