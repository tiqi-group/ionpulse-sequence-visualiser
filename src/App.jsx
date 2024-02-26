import { useState, useEffect } from "react";
import NavBar from "./Header";
import { Link, Routes, Route } from "react-router-dom";
import { Hardware } from "./Hardware";
import { SequencePlotPage } from "./SequencePlotPage";

import settings from "../settings";
import { socket } from "./socket";

function App() {
  const [channelDescription, setChannelDescription] = useState(() => {
    let init = {};
    for (var i = 0; i < 32; i++) {
      init["RF" + i] = {
        name: "RF" + i,
        type: "single_pass",
        central_frequency: 100,
        order: 1,
        dds_channels: i,
        group: "RF",
      };
      init["TTL" + i] = {
        name: "TTL" + i,
        group: "TTL",
      };
    }
    init["PMT0"] = {
      name: "PMT0",
      group: "PMT",
    };
    return init;
  });
  const [sequenceData, setSequenceData] = useState(() => {
    let init = {};
    for (const k in channelDescription) {
      if (k.includes("RF")) {
        init[k] = {
          freq: [0],
          phase: [0],
          amp: [0],
          time: [0],
          names: [{ sequences: [""] }],
        };
      } else {
        init[k] = { time: [0], values: [0] };
      }
    }
    return init;
  });
  var libraryIp = settings["Library ip"];
  var libraryPort = settings["Library port"];

  function updateChannelSettings(description) {
    let newSettings = {};
    Object.assign(newSettings, description["RFs"]);
    for (const key in newSettings) {
      newSettings[key].group = "RF";
    }
    for (const group of ["RF", "TTL", "PMT"]) {
      for (const [key, value] of Object.entries(description[group + "s"])) {
        newSettings[key] = { ...value };
        newSettings[key].group = group;
      }
    }
    setChannelDescription(newSettings);
  }

  useEffect(() => {
    console.log("Called App effect");
    const hardware_url = `http://${libraryIp}:${libraryPort}/Hardware`;

    fetch(hardware_url + "/description")
      .then((response) => response.json())
      .then((data) => {
        updateChannelSettings(JSON.parse(data));
      });

    fetch(hardware_url + "/scope_sequence")
      .then((response) => response.json())
      .then((data) => {
        setSequenceData(JSON.parse(data));
      });

    function updateSequenceData(value) {
      // Extracting data from the notification
      if (value.data.name == "Hardware.scope_sequence") {
        setSequenceData(JSON.parse(value.data.value));
      }
    }

    socket.on("notify", updateSequenceData);
    return () => socket.off("notify", updateSequenceData);
  }, []);

  return (
    <>
      <NavBar />
      <Routes>
        <Route
          path="/plot"
          element={
            <SequencePlotPage
              channelDescription={channelDescription}
              sequenceData={sequenceData}
            />
          }
        />
        <Route
          path="/hardware"
          element={<Hardware channelDescription={channelDescription} />}
        />
        <Route path="/" element={<Link to="/plot">Go to plot</Link>} />
      </Routes>
    </>
  );
}

export default App;
