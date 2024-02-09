import { useState } from "react";
import { SequenceVisualiser } from "./SequenceVisualiser";

import { SequenceParser } from "./SequenceParser.js";

const IonpulseSequenceVisualiser = function IonpulseSequenceVisualiser({
  channelDescription,
  ionpulseSequence,
}) {
  let sequenceParser = new SequenceParser(ionpulseSequence);

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

  function updateSequenceConfig(newSequenceConfig) {
    setSequenceConfig(newSequenceConfig);
  }

  return (
    <SequenceVisualiser
      channelDescription={channelDescription}
      sequenceData={sequenceParser.plotData}
      sequenceConfig={sequenceConfig}
      setSequenceConfig={updateSequenceConfig}
    />
  );
};

export { IonpulseSequenceVisualiser };
