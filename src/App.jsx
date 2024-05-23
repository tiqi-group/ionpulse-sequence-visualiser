import { useState, useEffect } from "react";
import NavBar from "./Header";
import { Link, Routes, Route, useNavigate } from "react-router-dom";
import { Hardware } from "./Hardware";
import { IonpulseSequenceVisualiser } from "./IonpulseSequenceVisualiser";
import { Configurator } from "./Configurator";

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

  const navigate = useNavigate();

  useEffect(() => {
    const url = `${library.address}:${library.port}`;
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
        .then((response) => {
          if (response.ok) {
            response.json().then((data) => {
              if (isConnectionUp) {
                updateChannelDescription(JSON.parse(data));
              }
            });
          } else {
            isConnectionUp = false;
            navigate("/config");
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
          navigate("/config");
        });

      await promise;

      if (isConnectionUp) {
        socket.on("notify", updateIonpulseSequence);
      }
    };

    fetchData();

    return () => {
      isConnectionUp = false;
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
          element={<Configurator library={library} setLibrary={setLibrary} />}
        />
      </Routes>
    </>
  );
}

export default App;
