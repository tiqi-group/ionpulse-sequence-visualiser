import { useState, useEffect } from "react";
import NavBar from "./Header";
import { Link, Routes, Route } from "react-router-dom";
import { Hardware } from "./Hardware";
import { IonpulseSequenceVisualiser } from "./IonpulseSequenceVisualiser";

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
        dds_channels: [i],
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
  const [ionpulseSequence, setIonpulseSequence] = useState(() => {
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
    return init;
  });
  var libraryIp = settings["Library ip"];
  var libraryPort = settings["Library port"];

  function updateChannelDescription(description) {
    let newDescription = {};
    for (const group of ["RF", "TTL", "PMT"]) {
      for (const [key, value] of Object.entries(description[group + "s"])) {
        newDescription[key] = {
          ...value,
          group: group,
        };
      }
    }
    setChannelDescription(newDescription);
  }

  useEffect(() => {
    const hardware_url = `http://${libraryIp}:${libraryPort}/Hardware`;

    fetch(hardware_url + "/description")
      .then((response) => response.json())
      .then((data) => {
        updateChannelDescription(JSON.parse(data));
      });

    fetch(hardware_url + "/sequence")
      .then((response) => response.json())
      .then((data) => {
        setIonpulseSequence(JSON.parse(data));
      });

    function updateIonpulseSequence(value) {
      // Extracting data from the notification
      if (value.data.name == "Hardware.sequence") {
        setIonpulseSequence(JSON.parse(value.data.value));
      }
    }

    socket.on("notify", updateIonpulseSequence);
    return () => socket.off("notify", updateIonpulseSequence);
  }, []);

  return (
    <>
      <NavBar />
      <Routes>
        <Route
          path="/plot"
          element={
            <IonpulseSequenceVisualiser
              channelDescription={channelDescription}
              ionpulseSequence={ionpulseSequence}
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
