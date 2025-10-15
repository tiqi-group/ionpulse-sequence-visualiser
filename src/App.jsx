import { useState, useEffect, useRef } from "react";
import NavBar from "./Header";
import { Link, Routes, Route, Navigate } from "react-router-dom";
import { Hardware, channelGroups } from "./Hardware";
import { IonpulseSequenceVisualiser } from "./IonpulseSequenceVisualiser";
import { Configurator } from "./Configurator";
import { DescriptionOverride } from "./DescriptionOverride";

import { io } from "socket.io-client";
import { ConnectionStatus } from "./ConnectionStatus";

function App() {
  const remoteChannelDescription = useRef({});
  const [channelDescription, setChannelDescription] = useState(
    remoteChannelDescription.current,
  );
  const [channelDescriptionOverride, setChannelDescriptionOverride] =
    useState(false);
  const remoteIonpulseSequence = useRef(() => {
    let init = {
      header: {
        channel_idx_to_hw: [],
      },
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
  const [ionpulseSequence, setIonpulseSequence] = useState(
    remoteIonpulseSequence.current,
  );
  const [sequenceOverride, setSequenceOverride] = useState(false);

  function updateChannelDescription(description) {
    let newDescription = {};
    for (const group of channelGroups) {
      if (Object.hasOwn(description, group + "s")) {
        for (const [key, value] of Object.entries(description[group + "s"])) {
          newDescription[key] = {
            ...value,
            group: group,
          };
          newDescription[key]["hw_channels"] = newDescription[key][
            "hw_channels"
          ].map((v) => {
            if (
              Object.hasOwn(v, "channel") &&
              Object.hasOwn(v, "device") &&
              Object.hasOwn(v, "hardware")
            ) {
              return (
                "" + v["device"] + " " + v["hardware"] + " " + v["channel"]
              );
            } else {
              return 'Incomplete hw channel description: "' + v + '"';
            }
          });
        }
      }
    }
    if (!channelDescriptionOverride) {
      setChannelDescription(newDescription);
    }
    remoteChannelDescription.current = newDescription;
  }

  function updateIonpulseSequence(sequence) {
    if (!sequenceOverride) {
      setIonpulseSequence(sequence);
    }
    remoteIonpulseSequence.current = sequence;
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

    function updateIonpulseSequenceFromJSON(value) {
      // Extracting data from the notification
      if (value.data.name == "Hardware.sequence") {
        const json_sequence = JSON.parse(value.data.value);
        updateIonpulseSequence(json_sequence);
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
            updateIonpulseSequence(JSON.parse(data));
          }
        })
        .catch((response) => {
          isConnectionUp = false;
        });

      await promise;

      if (isConnectionUp) {
        socket.connect();
        socket.on("notify", updateIonpulseSequenceFromJSON);
      }
    };

    fetchData();

    return () => {
      isConnectionUp = false;
      controller.abort();
      socket.off("notify", updateIonpulseSequenceFromJSON);
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
          element={
            <div>
              <Hardware channelDescription={channelDescription} />
              <DescriptionOverride
                prefix="Channel"
                remoteDescription={remoteChannelDescription.current}
                setUsedDescription={setChannelDescription}
                overrideOn={channelDescriptionOverride}
                setOverrideOn={setChannelDescriptionOverride}
              />
            </div>
          }
        />
        <Route
          exact
          path="/"
          element={
            connectionStatus == ConnectionStatus.failed ? (
              <Navigate to="/config" />
            ) : (
              <Navigate to="/plot" />
            )
          }
        />
        <Route
          path="/config"
          element={
            <div>
              <Configurator
                library={library}
                setLibrary={setLibrary}
                connectionStatus={connectionStatus}
              />
              <div />
              <DescriptionOverride
                prefix="Sequence"
                remoteDescription={remoteIonpulseSequence.current}
                setUsedDescription={setIonpulseSequence}
                overrideOn={sequenceOverride}
                setOverrideOn={setSequenceOverride}
              />
            </div>
          }
        />
      </Routes>
    </>
  );
}

export default App;
