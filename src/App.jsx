import { useState, useEffect } from "react";
import NavBar from "./Header";
import { Link, Routes, Route } from "react-router-dom";
import { Hardware } from "./Hardware";
import { IonpulseSequenceVisualiser } from "./IonpulseSequenceVisualiser";
import { Configurator } from "./Configurator";
import { setConnectionState } from "./ConnectionState";

import { io } from "socket.io-client";

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

  if (localStorage.getItem("libraryAddress") == null) {
    localStorage.setItem("libraryAddress", "localhost");
  }
  if (localStorage.getItem("libraryPort") == null) {
    localStorage.setItem("libraryPort", "8003");
  }

  useEffect(() => {
    const url = `${localStorage.getItem("libraryAddress")}:${localStorage.getItem("libraryPort")}`;
    const hardware_url = `http://${url}/Hardware`;

    const socket = io(`ws://${url}`, {
      path: "/ws/socket.io/",
    });

    function updateIonpulseSequence(value) {
      // Extracting data from the notification
      if (value.data.name == "Hardware.sequence") {
        setIonpulseSequence(JSON.parse(value.data.value));
      }
    }

    let isConnectionUp = true;
    const fetchData = async () => {
      let promise = fetch(hardware_url + "/description")
        .then((response) => response.json())
        .then((data) => {
          if (isConnectionUp) {
            updateChannelDescription(JSON.parse(data));
          }
        })
        .catch((response) => {
          isConnectionUp = false;
        });
      fetch(hardware_url + "/sequence")
        .then((response) => response.json())
        .then((data) => {
          if (isConnectionUp) {
            setIonpulseSequence(JSON.parse(data));
          }
        })
        .catch((response) => {
          isConnectionUp = false;
        });

      await promise;

      if (isConnectionUp) {
        setConnectionState(true);
        socket.on("notify", updateIonpulseSequence);
      }
    };

    fetchData();

    return () => {
      isConnectionUp = false;
      setConnectionState(false);
      socket.off("notify", updateIonpulseSequence);
    };
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
        <Route path="/config" element={<Configurator />} />
      </Routes>
    </>
  );
}

export default App;
