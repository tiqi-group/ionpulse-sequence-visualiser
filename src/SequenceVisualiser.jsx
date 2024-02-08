import { useState } from "react";

import EnablingGroupOff from "./OffCanvas";
import { PulseSequencePlot } from "./PulseSequencePlot";
import { SequenceBlockPlot } from "./SequenceBlockPlot";

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

  const [sequenceConfig, setSequenceConfig] = useState(() => {
    if (sequenceParser.hasNames) {
      return Object.entries(sequenceParser.sequenceConfig).reduce(
        (cfg, entry) => {
          cfg[entry[1]["name"]] = entry[1];
          return cfg;
        },
        {},
      );
    } else {
      return sequenceParser.sequenceConfig;
    }
  });

  const sequenceConfigKeys = Object.keys(sequenceConfig);
  const newConfigKeys = Object.keys(sequenceParser.sequenceConfig);
  const configKeysUnion = new Set(sequenceConfigKeys.concat(newConfigKeys));

  if (configKeysUnion.size !== sequenceConfigKeys.length) {
    let newSequenceConfig = {
      ...sequenceConfig,
      ...sequenceParser.sequenceConfig,
    };
    setSequenceConfig(newSequenceConfig);
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
            sequenceData={sequenceParser.plotData}
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
