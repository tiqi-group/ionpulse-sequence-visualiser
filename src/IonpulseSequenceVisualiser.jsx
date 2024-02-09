import { useState } from "react";
import { SequenceVisualiser } from "./SequenceVisualiser";

import { SequenceParser } from "./SequenceParser.js";

const IonpulseSequenceVisualiser = function IonpulseSequenceVisualiser({
  channelDescription,
  ionpulseSequence,
}) {
  const [sequenceConfig, setSequenceConfig] = useState({});

  let sequenceParser = new SequenceParser(ionpulseSequence, sequenceConfig);

  function updateSequenceConfig(updater) {
    setSequenceConfig(updater);
  }

  return (
    <SequenceVisualiser
      channelDescription={channelDescription}
      sequenceData={sequenceParser.plotData}
      sequenceConfig={sequenceParser.sequenceConfig}
      setSequenceConfig={updateSequenceConfig}
    />
  );
};

export { IonpulseSequenceVisualiser };
