import { useImmer } from "use-immer";
import { SequenceVisualiser } from "./SequenceVisualiser";

import { SequenceParser } from "./SequenceParser.js";

const IonpulseSequenceVisualiser = function IonpulseSequenceVisualiser({
  channelDescription,
  ionpulseSequence,
}) {
  const [sequenceConfig, setSequenceConfig] = useImmer({});

  let sequenceParser = new SequenceParser(ionpulseSequence, sequenceConfig);

  function updateSequenceConfig(recipe) {
    setSequenceConfig(recipe);
  }

  return (
    <SequenceVisualiser
      channelDescription={channelDescription}
      pulseSequenceData={sequenceParser.plotData}
      sequenceBlockData={sequenceParser.sequenceBlockData}
      sequenceConfig={sequenceConfig}
      setSequenceConfig={updateSequenceConfig}
    />
  );
};

export { IonpulseSequenceVisualiser };
