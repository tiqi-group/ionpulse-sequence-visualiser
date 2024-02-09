import Plot from "react-plotly.js";
import { getNumberOfEnabledChannels, RF_HEIGHT } from "./PlotHelpers";
import { blue, red, grey } from "@mui/material/colors";
import { N_RF_CHANNELS } from "./SequenceParser";

const typeToColor = {
  Loop: blue[800],
  LinearSequence: grey[500],
  Fork: red[800],
};

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

  const mainSequenceConfig = Object.hasOwn(sequenceConfig, "main")
    ? sequenceConfig["main"]
    : sequenceConfig[Object.keys(sequenceConfig).length - 1];

  const depthYShrink = 1 / 2 / mainSequenceConfig["maxDepth"] / totalChannels; // is normalised
  const xPad = 1;
  const yPad = 0.02 / totalChannels;

  const maxTime = mainSequenceConfig["endTime"].at(-1);

  const margin = {
    b: 100,
    l: 100,
    r: 100,
    t: 100,
  };

  let layout = {
    width: 1100 + margin.l + margin.r,
    height: totalHeight + margin.t + margin.b,
    margin: margin,
    grid: {
      rows: totalChannels,
      columns: 1,
    },
    xaxis: {
      rangemode: "nonnegative",
    },
  };

  const yaxisInit = {
    range: [-1, 1],
    tickmode: "array",
    tickvals: [0],
    fixedrange: true,
  };

  let data = [];

  if (hasDigitalIo) {
    const yaxis = "yaxis";
    layout[yaxis] = { ...yaxisInit };
    layout[yaxis]["ticktext"] = ["Digital IO"];
    layout[yaxis]["domain"] = [(totalChannels - 1) / totalChannels, 1];
    layout[yaxis]["anchor"] = "x";
    data.push({
      x: [0, maxTime],
      y: [0, 0],
      yaxis: "y",
      type: "scatter",
      name: "Digital IO",
      marker: { color: "green" },
      showlegend: false,
    });
  }

  const channelToAxisIdx = [...Array(N_RF_CHANNELS).keys()].reduce(
    ([o, axisIdx], idx) => {
      if (channelEnabled["RF" + idx]) {
        o["RF" + idx] = axisIdx;
        return [o, axisIdx + 1];
      }
      return [o, axisIdx];
    },
    [{}, 0 + hasDigitalIo],
  )[0];
  for (let rf_idx = 0; rf_idx < N_RF_CHANNELS; ++rf_idx) {
    const key = "RF" + rf_idx;
    if (channelEnabled[key]) {
      const i = channelToAxisIdx[key];
      const axisPostfix = i > 0 ? "" + (1 + i) : "";
      const yaxis = "yaxis" + axisPostfix;
      layout[yaxis] = { ...yaxisInit };
      layout[yaxis]["ticktext"] = [key];
      layout[yaxis]["domain"] = [
        (totalChannels - i - 1) / totalChannels,
        (totalChannels - i) / totalChannels,
      ];
      layout[yaxis]["anchor"] = "x" + axisPostfix;
      data.push({
        x: [0, maxTime],
        y: [0, 0],
        yaxis: "y" + axisPostfix,
        type: "scatter",
        name: key,
        marker: { color: "blue" },
        showlegend: false,
      });
    }
  }
  layout.shapes = [];

  for (const [key, sequence] of Object.entries(sequenceConfig)
    .slice(0, -1)
    .reverse()) {
    let yDataPairs = [];
    let startYData;
    for (let rf_idx = N_RF_CHANNELS - 1; rf_idx >= 0; --rf_idx) {
      const key = "RF" + rf_idx;
      if (!channelEnabled[key]) continue;
      const i = channelToAxisIdx[key];

      if (startYData === undefined) {
        if ((1 << rf_idx) & sequence["ch_mask"]["rf"]) {
          startYData = (totalChannels - i - 1) / totalChannels;
        }
      } else if ((1 << rf_idx) & ~sequence["ch_mask"]["rf"]) {
        yDataPairs.push([startYData, (totalChannels - i - 1) / totalChannels]);
        startYData = undefined;
      }
    }
    if (startYData === undefined) {
      if (sequence["ch_mask"]["digital_io"] && hasDigitalIo) {
        yDataPairs.push([(totalChannels - 1) / totalChannels, 1]);
      }
    } else {
      yDataPairs.push([
        startYData,
        sequence["ch_mask"]["digital_io"] && hasDigitalIo
          ? 1
          : (totalChannels - 1) / totalChannels,
      ]);
    }

    for (const [xData, depth] of sequence["startTime"].map((val, i) => [
      [val, sequence["endTime"][i]],
      sequence["depth"][i],
    ])) {
      for (const yData of yDataPairs) {
        layout.shapes.push({
          type: "rect",
          xref: "x0",
          yref: "paper",
          x0: xData[0] + xPad,
          x1: xData[1] - xPad,
          y0: yData[0] + depthYShrink * (depth - 1) + yPad,
          y1: yData[1] - depthYShrink * (depth - 1) - yPad,
          fillcolor: typeToColor[sequence["type"]],
          opacity: 0.5,
          label: {
            text: Object.hasOwn(sequence, "name") ? sequence["name"] : key,
            font: {
              size: 10,
            },
            textangle: xData[1] - xData[0] < 20 ? 90 : 0,
            textposition:
              xData[1] - xData[0] < 20 ? "middle center" : "top center",
            padding: 3,
          },
          sequenceKey: key,
        });
      }
    }
  }
  const onClick = (event) => {
    console.log("Event: ", event);
    let deepestShape;
    for (const shape of layout.shapes) {
      if (
        shape.x0 <= event.x &&
        event.x <= shape.x1 &&
        shape.y0 <= event.y &&
        event.y <= shape.y1
      ) {
        if (deepestShape) {
          if (
            sequenceConfig[shape.sequenceKey]["depth"] >
            sequenceConfig[deepestShape.sequenceKey]["depth"]
          ) {
            deepestShape = shape;
          }
        } else {
          deepestShape = shape;
        }
      }
    }
    if (deepestShape) {
      console.log("Found shape: ", deepestShape);
      const configKey = Object.hasOwn(
        sequenceConfig[deepestShape.sequenceKey],
        "name",
      )
        ? sequenceConfig[deepestShape.sequenceKey]["name"]
        : deepestShape.sequenceKey;
      setSequenceConfig((oldConfig) => {
        let newDisplay = sequenceConfig[deepestShape.sequenceKey]["display"];
        newDisplay = newDisplay == "full" ? "hide" : "full";
        oldConfig[configKey] = {
          ...oldConfig[configKey],
          display: newDisplay,
        };
      });
    }
  };

  console.log("Block layout: ", layout);

  return (
    <Plot data={data} layout={layout} onClick={() => console.log("click")} />
  );
};

export { SequenceBlockPlot };
