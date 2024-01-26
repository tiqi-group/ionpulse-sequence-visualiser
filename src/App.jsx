import io from "socket.io-client";
import React, { useState } from "react";
import Plot from "react-plotly.js";
import { RFScope } from "./Channels";
import NavBar from "./Header";
import EnablingGroupOff from "./OffCanvas";
import Container from "react-bootstrap/Container";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Hardware } from "./Hardware";

import { EnablingGroup } from "./VisualiserConfiguration";

import { IpPort } from "./Settings";
import settings from "../settings";

var RF = {};
var TTLs = {};
let rf_names_map = {};
let TTL_names_map = {};
let RF_input = {};

for (var i = 0; i <= 32; i++) {
  RF["RF" + i] = { enabled: false, showing: "freq" };
  TTLs["TTL" + i] = { enabled: false };
  rf_names_map["RF" + i] = "RF" + i;
  TTL_names_map["TTL" + i] = "TTL" + i;
  RF_input["RF" + i] = {
    freq: [0],
    phase: [0],
    amp: [0],
    time: [0],
    names: [{ sequences: [""] }],
  };
  RF_input["TTL" + i] = { time: [0], values: [0] };
}

RF_input["PMT0"] = { time: [0], values: [0] };

// TTLs["TTL1"].enabled= true
// TTLs["TTL2"].enabled= true
// TTLs["TTL3"].enabled= true
// TTLs["TTL4"].enabled= true
// TTLs["TTL5"].enabled= true

export default class App extends React.Component {
  constructor() {
    super();
    console.log("Start constructor");
    this.state = {
      // TTL_input: TTL_input,
      enabledChannels: { ...RF, ...TTLs },
      RF_input: RF_input,
      aom_configuration: {},
      rf_names_map: rf_names_map,
      TTL_names_map: TTL_names_map,
    };
    this.libraryIp = settings["Library ip"];
    this.libraryPort = settings["Library port"];
    this.handleRFChange = this.handleRFChange.bind(this);
    this.createRFMap = this.createRFMap.bind(this);
    this.onNotify = this.onNotify.bind(this);
    this.handleFreqPhaseSwap = this.handleFreqPhaseSwap.bind(this);
    let socket_url = `ws://${this.libraryIp}:${this.libraryPort}`;
    this.socket = io(socket_url, {
      path: "/ws/socket.io/",
      transports: ["websocket"],
    });
    this.socket.on("notify", (value) => {
      //console.log(this.state.RF_input);
      // Extracting data from the notification
      if (value.data.name == "Hardware.scope_sequence") {
        this.setState({ RF_input: JSON.parse(value.data.value) });
      }
    });
  }

  componentDidMount() {
    let hardware_url = `http://${this.libraryIp}:${this.libraryPort}/Hardware/description`;
    fetch(hardware_url)
      .then((response) => response.json())
      .then((data) => {
        this.setState({ aom_configuration: JSON.parse(data)["RFs"] });
        this.setState({
          rf_names_map: this.createRFMap(JSON.parse(data)["RFs"]),
        });
        this.setState({
          TTL_names_map: this.createTTLMap(JSON.parse(data)["TTLs"]),
        });
      });
  }

  onNotify(value) {
    if (value.data.name == "Hardware.scope_sequence") {
      this.setState({ RF_input: JSON.parse(value.data.value) });
    }
  }

  createRFMap(aom_configuration) {
    let RF_map = rf_names_map;
    let enabledRFs = RF;
    for (const [channel, value] of Object.entries(aom_configuration)) {
      RF_map[channel] = value.name;
      enabledRFs[channel].enabled = true;
      this.setState({ enabledChannels: { ...enabledRFs, ...TTLs } });
    }
    return RF_map;
  }

  createTTLMap(TTL_configuration) {
    let TTL_map = TTL_names_map;
    let enabledTTLs = TTLs;
    for (const [channel, value] of Object.entries(TTL_configuration)) {
      TTL_map[channel] = value;
      enabledTTLs[channel].enabled = true;
      this.setState({ enabledChannels: { ...RF, ...enabledTTLs } });
    }
    return TTL_map;
  }

  handleIPPortChange(ip, port) {
    console.log(ip, port);
  }

  // handleTTLChange(e) {
  //   this.state.enabledTTLs[e.name] = !this.state.enabledTTLs[e.name];
  //   this.setState(e);

  // }

  handleRFChange(e) {
    this.state.enabledChannels[e.name].enabled =
      !this.state.enabledChannels[e.name].enabled;
    this.setState(e);
  }

  handleFreqPhaseSwap(channel) {
    if (this.state.enabledChannels[channel].showing == "freq") {
      this.state.enabledChannels[channel].showing = "phase";
      //this.setState({enabledChannels[channel].showing = "phase"}) TODO: Move to setState
    } else if (this.state.enabledChannels[channel].showing == "phase") {
      this.state.enabledChannels[channel].showing = "freq";
    }
    console.log(this.state.enabledChannels[channel].showing);
    this.setState({ channel });
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
            <Route
              path="/main"
              element={
                <div>
                  <EnablingGroupOff
                    Enablers={
                      <EnablingGroup
                        names_map={this.state.rf_names_map}
                        names_map_TTL={this.state.TTL_names_map}
                        enabledChannels={this.state.enabledChannels}
                        enabled_TTL_channels={this.state.enabledTTLs}
                        onEvent={this.handleRFChange}
                      />
                    }
                  />

                  <RFScope
                    RF_input={this.state.RF_input}
                    enabledChannels={this.state.enabledChannels}
                    rf_names_map={this.state.rf_names_map}
                    TTL_names_map={this.state.TTL_names_map}
                    channelSwapHandler={this.handleFreqPhaseSwap}
                  />
                </div>
              }
            />
            <Route
              path="/hardware"
              element={
                <Hardware aomConfiguration={this.state.aom_configuration} />
              }
            />
            {/* </Route> */}
          </Routes>
        </Router>
      </body>
    );
  }
}
