import { useState, useEffect } from "react";
import NavBar from "./Header";
import { Link, Routes, Route } from "react-router-dom";
import { Hardware } from "./Hardware";
import { IonpulseSequenceVisualiser } from "./IonpulseSequenceVisualiser";
import { Configurator } from "./Configurator";

import { io } from "socket.io-client";
import { ConnectionStatus } from "./ConnectionStatus";

function App() {
  const [channelDescription, setChannelDescription] = useState(() => {
    let init = {};
    for (let i = 0; i < 32; i++) {
      init["RF" + i] = {
        name: "RF" + i,
        type: "single_pass",
        central_frequency: 100,
        order: 1,
        hw_channels: [
          "DDSHardware [" + Math.trunc(i / 4) + "," + (i % 4) + "]",
        ],
        group: "RF",
      };
      init["TTL" + i] = {
        name: "TTL" + i,
        hw_channels: ["DIOHardware"],
        sub_channel: i,
        group: "TTL",
      };
    }
    init["PMT0"] = {
      name: "PMT0",
      hw_channels: ["DIOHardware"],
      sub_channel: 0,
      group: "PMT",
    };
    return init;
  });
  const [ionpulseSequence, setIonpulseSequence] = useState(() => {
    let init = {
      freq: [],
      phase: [],
      amp: [],
      time: [],
      event: [],
      sequence: [
        {
          name: "main",
          type: "LinearSequence",
          ch_mask: [],
          sequences: [],
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
        newDescription[key]["hw_channels"] = newDescription[key][
          "hw_channels"
        ].map((v) => {
          return "" + v["device"] + " " + v["hardware"] + " " + v["channel"];
        });
      }
    }
    console.log(newDescription);
    setChannelDescription(newDescription);
  }

  const [library, setLibrary] = useState(() => {
    return {
      address: localStorage.getItem("libraryAddress") || "localhost",
      port: localStorage.getItem("libraryPort") || "8003",
    };
  });
  useEffect(() => {
    localStorage.setItem("libraryAddress", library.address);
    localStorage.setItem("libraryPort", library.port);
  }, [library]);

  const [connectionStatus, setConnectionStatus] = useState(
    ConnectionStatus.connecting,
  );

  const [connectionErrMsg, setConnectionErrMsg] = useState("");

  useEffect(() => {
    const url = `${library.address}:${library.port}`;
    const hardware_url = `http://${url}/Hardware`;

    const socket = io(`ws://${url}`, {
      path: "/ws/socket.io/",
      autoConnect: false,
    });

    function updateIonpulseSequence(value) {
      // Extracting data from the notification
      if (value.data.name == "Hardware.sequence") {
        setIonpulseSequence(JSON.parse(value.data.value));
      }
    }

    let isConnectionUp = true;
    setConnectionStatus(ConnectionStatus.connecting);
    const controller = new AbortController();
    const fetchData = async () => {
      let promise = fetch(hardware_url + "/description", {
        signal: controller.signal,
      })
        .then((response) => {
          if (response.ok) {
            response.json().then((data) => {
              if (isConnectionUp) {
                updateChannelDescription(JSON.parse(data));
              }
            });
            setConnectionStatus(ConnectionStatus.connected);
          } else {
            isConnectionUp = false;
            setConnectionStatus(ConnectionStatus.failed);
            setConnectionErrMsg(
              "" + response.status + " " + response.statusText,
            );
            console.log(response);
          }
        })
        .catch((exception) => {
          if (exception instanceof TypeError) {
            setConnectionStatus(ConnectionStatus.failed);
            setConnectionErrMsg(exception.message);
          }
          isConnectionUp = false;
        });
      fetch(hardware_url + "/sequence", { signal: controller.signal })
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
        socket.connect();
        socket.on("notify", updateIonpulseSequence);
      }
    };

    fetchData();

    return () => {
      isConnectionUp = false;
      controller.abort();
      socket.off("notify", updateIonpulseSequence);
    };
  }, [library]);

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
              connectionStatus={connectionStatus}
              connectionErrMsg={connectionErrMsg}
            />
          }
        />
        <Route
          path="/hardware"
          element={<Hardware channelDescription={channelDescription} />}
        />
        <Route path="/" element={<Link to="/plot">Go to plot</Link>} />
        <Route
          path="/config"
          element={
            <Configurator
              library={library}
              setLibrary={setLibrary}
              connectionStatus={connectionStatus}
            />
          }
        />
      </Routes>
    </>
  );
}

export default App;
