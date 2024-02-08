import { useState, useEffect } from "react";
import NavBar from "./Header";
import { Link, Routes, Route } from "react-router-dom";
import { Hardware } from "./Hardware";
import { SequenceVisualiser } from "./SequenceVisualiser";

import settings from "../settings";
import { socket } from "./socket";

import { SequenceParser } from "./SequenceParser.js";

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
  const [sequenceParser, setSequenceParser] = useState(() => {
    let init = {
      Freq: [],
      Phase: [],
      Amp: [],
      Time: [],
      Event: [],
      Sequence: [
        {
          name: "main",
          type: "LinearSequence",
          ch_mask: {
            rf: 0,
            digital_io: false,
            readout: false,
            qubit: 0,
          },
          rf_channel_sequences: {},
          digital_io: [],
          readout: [],
          qubit_sequences: {},
        },
      ],
    };
    return new SequenceParser(init);
  });
  var libraryIp = settings["Library ip"];
  var libraryPort = settings["Library port"];

  function updateChannelSettings(description) {
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
    setChannelDescription(newSettings);
  }

  useEffect(() => {
    const hardware_url = `http://${libraryIp}:${libraryPort}/Hardware`;

    fetch(hardware_url + "/description")
      .then((response) => response.json())
      .then((data) => {
        updateChannelSettings(JSON.parse(data));
      });

    fetch(hardware_url + "/sequence")
      .then((response) => response.json())
      .then((data) => {
        setSequenceParser(new SequenceParser(JSON.parse(data)));
      });

    function updateSequenceParser(value) {
      // Extracting data from the notification
      if (value.data.name == "Hardware.sequence") {
        setSequenceParser(new SequenceParser(JSON.parse(value.data.value)));
      }
    }

    socket.on("notify", updateSequenceParser);
    return () => socket.off("notify", updateSequenceParser);
  }, []);

  return (
    <>
      <NavBar />
      <Routes>
        <Route
          path="/plot"
          element={
            <SequenceVisualiser
              channelDescription={channelDescription}
              sequenceParser={sequenceParser}
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
