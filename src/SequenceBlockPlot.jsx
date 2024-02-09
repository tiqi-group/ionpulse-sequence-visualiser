import { getNumberOfEnabledChannels } from "./SequenceVisualiser";
import { TTL_HEIGHT, RF_HEIGHT } from "./SequenceVisualiser";

const SequenceBlockPlot = function ({
  channelDescription,
  channelEnabled,
  sequenceConfig,
  setSequenceConfig,
}) {
  const nChannels = getNumberOfEnabledChannels(channelEnabled);
  const hasDigitalIo = nChannels["TTL"] + nChannels["PMT"] > 0;
  const totalChannels = nChannels["RF"] + hasDigitalIo;
  const totalHeight = RF_HEIGHT * totalChannels;
  let layout = {
    width: 1100,
    height: totalHeight,
    grid: {
      rows: totalChannels,
      columns: 1,
    },
    xaxis: {
      rangemode: "nonnegative",
    },
  };

  if (hasDigitalIo) {
    layout["yaxisDIO"] = {};
    layout["yaxisDIO"]["domain"] = [1, totalChannels - 1 / totalChannels];
    layout["yaxisDIO"]["anchor"] = "x" + totalChannels - 1;
  }
  for (const [i, key] of Object.keys(channelEnabled).entries()) {
    layout["yaxis" + key] = {};
    layout["yaxis" + key]["domain"] = [
      (totalChannels - 1 - i) / totalChannels,
      (totalChannels - 1 - i - 1) / totalChannels,
    ];
    layout["yaxis" + key]["anchor"] = "x" + totalChannels - 1 - i - 1;
  }
  layout.shapes = [];

  const nRFKeys = Object.keys(channelEnabled).reduce(
    (acc, key) => acc + (key[0] === "R"),
    0,
  );
  for (const sequence of Object.values(sequenceConfig).reverse()) {
    let yDataPairs = [];
    let startYData;
    for (let i = nRFKeys - 1; i >= 0; --i) {
      if (!channelEnabled["RF" + i]) continue;

      if (startYData === undefined) {
        if ((1 << i) & sequence["ch_mask"]["rf"]) {
          startYData = totalChannels - 1 - i - 1 / totalChannels;
        }
      } else if ((1 << i) & ~sequence["ch_mask"]["rf"]) {
        yDataPairs.push([
          startYData,
          totalChannels - 1 - i - 1 / totalChannels,
        ]);
        startYData = undefined;
      }
    }
    if (startYData === undefined) {
      if (sequence["ch_mask"]["digital_io"]) {
        yDataPairs.push([(totalChannels - 1) / totalChannels, 1]);
      }
    } else {
      yDataPairs.push([
        startYData,
        sequence["ch_mask"]["digital_io"]
          ? 1
          : (totalChannels - 1) / totalChannels,
      ]);
    }

    for (const xData of sequence["startTime"].map((val, i) => [
      val,
      sequence["endTime"][i],
    ])) {
      for (const yData of yDataPairs) {
        layout.shapes.push({
          type: "rect",
          xref: "x0",
          yref: "paper",
          x0: xData[0],
          x1: xData[1],
          y0: yData[0],
          y1: yData[1],
          opacity: 0.7,
        });
      }
    }
  }

  return Object.keys(sequenceConfig).map((seq, i) => {
    return (
      <div key={seq}>
        <h3>{seq}</h3>
        {Object.entries(sequenceConfig[seq]).map((entry) => {
          return <p key={seq + entry[0]}>{entry[0] + ": " + entry[1]}</p>;
        })}
      </div>
    );
  });
};

export { SequenceBlockPlot };
