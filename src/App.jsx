import React from "react";
import NavBar from "./Header";
import { Link, Routes, Route } from "react-router-dom";
import { Hardware } from "./Hardware";
import { SequencePlotPage } from "./SequencePlotPage";

import settings from "../settings";
import { socket } from "./socket";

export default class App extends React.Component {
  constructor() {
    super();

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
    let sequenceData = {};
    for (const k in channelDescription) {
      if (k.includes("RF")) {
        sequenceData[k] = {
          freq: [0],
          phase: [0],
          amp: [0],
          time: [0],
          names: [{ sequences: [""] }],
        };
      } else {
        sequenceData[k] = { time: [0], values: [0] };
      }
    }
    this.state = {
      channelDescription: channelDescription,
      sequenceData: sequenceData,
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
    const hardware_url = `http://${this.libraryIp}:${this.libraryPort}/Hardware`;

    fetch(hardware_url + "/description")
      .then((response) => response.json())
      .then((data) => {
        this.updateChannelSettings(JSON.parse(data));
      });

    fetch(hardware_url + "/scope_sequence")
      .then((response) => response.json())
      .then((data) => {
        this.setState({ sequenceData: JSON.parse(data) });
      });

    socket.on("notify", (value) => {
      // Extracting data from the notification
      if (value.data.name == "Hardware.scope_sequence") {
        this.setState({ sequenceData: JSON.parse(value.data.value) });
      }
    });
  }

  componentWillUnmount() {
    socket.off("notify");
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
        <Routes>
          <Route
            path="/plot"
            element={
              <SequencePlotPage
                channelDescription={this.state.channelDescription}
                sequenceData={this.state.sequenceData}
              />
            }
          />
          <Route
            path="/hardware"
            element={
              <Hardware channelDescription={this.state.channelDescription} />
            }
          />
          <Route path="/" element={<Link to="/plot">Go to plot</Link>} />
        </Routes>
      </>
    );
  }
}
