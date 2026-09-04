import { useState, useEffect, useRef } from "react";
import NavBar from "./Header";
import { Link, Routes, Route, Navigate } from "react-router-dom";
import { Hardware, channelGroups } from "./Hardware";
import { generateChannelDescriptionFromSequence } from "./SequenceParser.js";
import { IonpulseSequenceVisualiser } from "./IonpulseSequenceVisualiser";
import { Configurator } from "./Configurator";
import { DescriptionOverride } from "./DescriptionOverride";

import { io } from "socket.io-client";
import { ConnectionStatus } from "./ConnectionStatus";
import { sequenceScope, isScoped } from "./sequenceScope";
import { loadSequenceView, saveSequenceView } from "./sequenceViewState";

function App() {
  const [restoredView] = useState(loadSequenceView);
  const [remoteChannelDescription, setRemoteChannelDescription] = useState({});
  const [channelDescription, setChannelDescription] = useState(
    remoteChannelDescription,
  );
  const [channelDescriptionOverride, setChannelDescriptionOverride] =
    useState(false);
  const [remoteIonpulseSequence, setRemoteIonpulseSequence] = useState(() => {
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
    () => restoredView?.sequence ?? remoteIonpulseSequence,
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
    setRemoteChannelDescription(newDescription);
  }

  function updateIonpulseSequence(sequence) {
    if (!sequenceOverride) {
      setIonpulseSequence(sequence);
    }
    setRemoteIonpulseSequence(sequence);
  }

  const [library, setLibrary] = useState(() => {
    return {
      address: localStorage.getItem("libraryAddress") || "localhost",
      port: localStorage.getItem("libraryPort"),
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

  // When disabled, incoming sequence events no longer overwrite the display
  // (similar to the "Latest" switch of ICON's data view). Windows opened for
  // a specific past sequence start with live updates off.
  const [visualizeLatest, setVisualizeLatest] = useState(
    restoredView?.visualizeLatest ?? !isScoped,
  );
  const visualizeLatestRef = useRef(visualizeLatest);
  visualizeLatestRef.current = visualizeLatest;

  useEffect(() => {
    saveSequenceView(visualizeLatest, ionpulseSequence);
  }, [visualizeLatest, ionpulseSequence]);

  const url = new URL(
    `${window.location.protocol === "https:" ? "wss" : "ws"}://${library.address}`,
  );
  if (library.port) {
    url.port = library.port;
  }

  useEffect(() => {
    const socket = io(url.toString(), {
      path: "/ws/socket.io/",
      transports: ["websocket"],
    });

    function updateIonpulseSequenceFromJSON(value) {
      if (!visualizeLatestRef.current) return;
      updateIonpulseSequence(JSON.parse(value));
    }

    setConnectionStatus(ConnectionStatus.connecting);
    const onConnect = () => {
      setConnectionStatus(ConnectionStatus.connected);
      setConnectionErrMsg("");
    };
    const onDisconnect = (reason) => {
      setConnectionStatus(ConnectionStatus.failed);
      setConnectionErrMsg(`Disconnected from ${url}: ${reason}`);
    };
    const onConnectError = (error) => {
      setConnectionStatus(ConnectionStatus.failed);
      setConnectionErrMsg(`Could not connect to ${url}: ${error.message}`);
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    socket.emit(
      "trigger_method",
      {
        access_path: "experiments.get_hardware_description",
        args: null,
        kwargs: null,
      },
      (input) => {
        try {
          updateChannelDescription(JSON.parse(input.value));
        } catch {
          console.warn("Could not parse hardware description");
        }
      },
    );

    socket.on("last_experiment_sequence", updateIonpulseSequenceFromJSON);

    // Fetch the initial sequence: the requested scope, or the latest executed
    // one (the event above only covers sequences executed from now on). A
    // restored sequence is kept instead, so that it is not overwritten.
    const serialized = (type, value) => ({
      full_access_path: "",
      type: type,
      value: value,
      readonly: false,
      doc: null,
    });
    const scopeKwargs = {};
    if (sequenceScope.jobId !== null) {
      scopeKwargs["job_id"] = serialized("int", sequenceScope.jobId);
    }
    if (sequenceScope.datapoint !== null) {
      scopeKwargs["index"] = serialized("int", sequenceScope.datapoint);
    }
    if (restoredView?.sequence == null) {
      socket.emit(
        "trigger_method",
        {
          access_path: "data.get_hardware_instructions",
          args: null,
          kwargs: serialized("dict", scopeKwargs),
        },
        (input) => {
          try {
            if (input.value) {
              updateIonpulseSequence(JSON.parse(input.value));
            }
          } catch {
            console.warn("Could not parse sequence JSON");
          }
        },
      );
    }

    return () => {
      socket.off("last_experiment_sequence", updateIonpulseSequenceFromJSON);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
    };
  }, [library]);

  return (
    <>
      <NavBar
        visualizeLatest={visualizeLatest}
        onVisualizeLatestChange={setVisualizeLatest}
      />
      <Routes>
        <Route
          path="/plot"
          element={
            <IonpulseSequenceVisualiser
              channelDescription={channelDescription}
              ionpulseSequence={ionpulseSequence}
              connectionStatus={
                channelDescriptionOverride && sequenceOverride
                  ? ConnectionStatus.connected
                  : connectionStatus
              }
              connectionErrMsg={connectionErrMsg}
            />
          }
        />
        <Route
          path="/hardware"
          element={<Hardware channelDescription={channelDescription} />}
        />
        <Route
          exact
          path="/"
          element={
            connectionStatus == ConnectionStatus.failed &&
            !(channelDescriptionOverride && sequenceOverride) ? (
              <Navigate to="/config" />
            ) : (
              <Navigate to="/plot" />
            )
          }
        />
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
        <Route
          path="/sequencejson"
          element={
            <DescriptionOverride
              key="SequenceDescription"
              prefix="Sequence"
              remoteDescription={remoteIonpulseSequence}
              setUsedDescription={setIonpulseSequence}
              overrideOn={sequenceOverride}
              setOverrideOn={setSequenceOverride}
            />
          }
        />
        <Route
          path="/descriptionjson"
          element={
            <DescriptionOverride
              key="ChannelDescription"
              prefix="Channel"
              remoteDescription={remoteChannelDescription}
              setUsedDescription={setChannelDescription}
              overrideOn={channelDescriptionOverride}
              setOverrideOn={setChannelDescriptionOverride}
              defaultDescription={generateChannelDescriptionFromSequence(
                ionpulseSequence,
              )}
            />
          }
        />
      </Routes>
    </>
  );
}

export default App;
