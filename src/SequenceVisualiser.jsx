import { useState } from "react";

import EnablingGroupOff from "./OffCanvas";
import { PulseSequencePlot } from "./PulseSequencePlot";
import { SequenceBlockPlot } from "./SequenceBlockPlot";

function getNumberOfEnabledChannels(channelEnabled) {
  return Object.keys(channelEnabled).reduce(
    (a, key) => {
      a[key[0] === "R" ? key.substring(0, 2) : key.substring(0, 3)] +=
        channelEnabled[key] == true;
      return a;
    },
    { RF: 0, TTL: 0, PMT: 0 },
  );
}

const SequenceVisualiser = function SequenceVisualiser({
  channelDescription,
  sequenceData,
  sequenceConfig,
  setSequenceConfig,
}) {
  const [channelEnabled, setChannelEnabled] = useState(() => {
    return Object.keys(channelDescription).reduce((init, k) => {
      init[k] = true;
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
        newChannelEnabled[k] = true;
      }
    }
    setChannelEnabled(newChannelEnabled);
  }

  function handleEnableChange(e) {
    let newChannelEnabled = { ...channelEnabled };
    newChannelEnabled[e.name] = !newChannelEnabled[e.name];
    setChannelEnabled(newChannelEnabled);
  }

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
            sequenceData={sequenceData}
          />
        </div>
        <div className="col">
          <SequenceBlockPlot
            channelDescription={channelDescription}
            channelEnabled={channelEnabled}
            sequenceConfig={sequenceConfig}
            setSequenceConfig={setSequenceConfig}
          />
        </div>
      </div>
    </>
  );
};

export const TTL_HEIGHT = 40;
export const RF_HEIGHT = 70;
export { SequenceVisualiser, getNumberOfEnabledChannels };
