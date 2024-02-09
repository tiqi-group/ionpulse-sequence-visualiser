import { useState } from "react";

import EnablingGroupOff from "./OffCanvas";
import { PulseSequencePlot } from "./PulseSequencePlot";
import { SequenceBlockPlot } from "./SequenceBlockPlot";

const SequenceVisualiser = function SequenceVisualiser({
  channelDescription,
  sequenceData,
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

export { SequenceVisualiser };
