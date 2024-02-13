import { useState } from "react";

import EnablingGroupOff from "./OffCanvas";
import { PulseSequencePlot } from "./PulseSequencePlot";
import { SequenceBlockPlot } from "./SequenceBlockPlot";

const SequenceVisualiser = function SequenceVisualiser({
  channelDescription,
  pulseSequenceData,
  sequenceBlockData,
  sequenceConfig,
  setSequenceConfig,
}) {
  const [channelEnabled, setChannelEnabled] = useState(() => {
    return Object.keys(channelDescription).reduce((init, k) => {
      init[k] = false;
      return init;
    }, {});
  });

  const channelEnabledKeys = Object.keys(channelEnabled);
  const channelDescKeys = Object.keys(channelDescription);
  const allKeys = channelEnabledKeys.concat(channelDescKeys);
  const union = new Set(allKeys);

  if (union.size !== channelEnabledKeys.length) {
    let newChannelEnabled = { ...channelEnabled };
    for (const k of channelDescKeys) {
      if (!(k in channelEnabled)) {
        newChannelEnabled[k] = false;
      }
    }
    setChannelEnabled(newChannelEnabled);
  }

  function handleEnableChange(e) {
    let newChannelEnabled = { ...channelEnabled };
    newChannelEnabled[e.name] = !newChannelEnabled[e.name];
    setChannelEnabled(newChannelEnabled);
  }

  const xDomains = sequenceBlockData.slice(0, -1).reduce(
    (domain, seq, i) => {
      if (sequenceConfig[i] && sequenceConfig[i]["display"] == "hide") {
        if (seq["type"] === "Loop") {
        } else {
          for (const call of seq["calls"]) {
            const startIdx = domain.findIndex((val) => val > call["startTime"]);
            const endIdx = domain.findIndex((val) => val > call["endTime"]);
            domainStart = domain.slice(0, startIdx);
          }
        }
      }
      return domain;
    },
    [0, sequenceBlockData.at(-1)["calls"].at(-1)["endTime"]],
  );

  return (
    <>
      <EnablingGroupOff
        channelDescription={channelDescription}
        channelEnabled={channelEnabled}
        handleEnableChange={handleEnableChange}
      />
      <div className="row">
        <div className="col">
          <PulseSequencePlot
            channelDescription={channelDescription}
            channelEnabled={channelEnabled}
            sequenceData={pulseSequenceData}
          />
        </div>
        <div className="col">
          <SequenceBlockPlot
            channelDescription={channelDescription}
            channelEnabled={channelEnabled}
            sequenceBlockData={sequenceBlockData}
            sequenceConfig={sequenceConfig}
            setSequenceConfig={setSequenceConfig}
          />
        </div>
      </div>
    </>
  );
};

export { SequenceVisualiser };
