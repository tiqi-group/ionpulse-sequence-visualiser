const SequenceBlockPlot = function ({
  channelDescription,
  channelEnabled,
  sequenceConfig,
  setSequenceConfig,
}) {
  return Object.keys(sequenceConfig).map((seq, i) => {
    return (
      <div key={seq}>
        <h3>{seq}</h3>
        display: {sequenceConfig[seq].display}
      </div>
    );
  });
};

export { SequenceBlockPlot };
