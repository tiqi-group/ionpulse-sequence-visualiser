import React from "react";
import NavBar from "./Header";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Hardware } from "./Hardware";
import { SequencePlotPage } from "./SequencePlotPage";

import settings from "../settings";

let channelDescription = {};
for (var i = 0; i < 32; i++) {
  channelDescription["RF" + i] = {
    name: "RF" + i,
    type: "single_pass",
    central_frequency: 100,
    order: 1,
    dds_channels: i,
    group: "RF",
  };
  channelDescription["TTL" + i] = {
    name: "TTL" + i,
    group: "TTL",
  };
}
channelDescription["PMT0"] = {
  name: "PMT0",
  group: "PMT",
};

export default class App extends React.Component {
  constructor() {
    super();
    this.state = {
      channelDescription: channelDescription,
    };
    this.libraryIp = settings["Library ip"];
    this.libraryPort = settings["Library port"];
  }

  updateChannelSettings(description) {
    let newSettings = {};
    Object.assign(newSettings, description["RFs"]);
    for (const key in newSettings) {
      newSettings[key].group = "RF";
    }
    for (const group of ["PMT", "TTL"]) {
      for (const [key, value] of Object.entries(description[group + "s"])) {
        newSettings[key] = {
          name: value,
          group: group,
        };
      }
    }
    this.setState({ channelDescription: newSettings });
  }

  componentDidMount() {
    let hardware_url = `http://${this.libraryIp}:${this.libraryPort}/Hardware`;
    fetch(hardware_url + "/description")
      .then((response) => response.json())
      .then((data) => {
        this.updateChannelSettings(JSON.parse(data));
      });
  }

  handleIPPortChange(ip, port) {
    console.log(ip, port);
  }

  render() {
    return (
      <>
        <NavBar />
        {/* <Container fluid="sm">
        <IpPort handler = {this.handleIPPortChange}/>
        </Container> */}
        <Router>
          <Routes>
            <Route
              path="/plot"
              element={
                <SequencePlotPage
                  channelDescription={this.state.channelDescription}
                />
              }
            />
            <Route
              path="/hardware"
              element={
                <Hardware channelDescription={this.state.channelDescription} />
              }
            />
          </Routes>
        </Router>
      </>
    );
  }
}
