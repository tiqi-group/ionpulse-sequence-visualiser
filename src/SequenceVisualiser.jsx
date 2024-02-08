import { useState } from "react";

import EnablingGroupOff from "./OffCanvas";
import { PulseSequencePlot } from "./PulseSequencePlot";

const SequenceVisualiser = function SequenceVisualiser({
  channelDescription,
  sequenceParser,
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
    <div>
      <EnablingGroupOff
        channelDescription={channelDescription}
        channelEnabled={channelEnabled}
        handleEnableChange={handleEnableChange}
      />
      <PulseSequencePlot
        channelDescription={channelDescription}
        channelEnabled={channelEnabled}
        sequenceData={sequenceParser.plotData}
      />
    </div>
  );
};

export { SequenceVisualiser };
