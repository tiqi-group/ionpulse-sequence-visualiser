// import Plot from "react-plotly.js";
import * as Plot from "@observablehq/plot";
import { useRef, useEffect } from "react";
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

  const mainSequenceConfig = Object.hasOwn(sequenceConfig, "main")
    ? sequenceConfig["main"]
    : sequenceConfig[Object.keys(sequenceConfig).length - 1];

  const depthYShrink = 1 / 2 / mainSequenceConfig["maxDepth"];
  const xPad = 1;
  const yPad = 0.02;

  const maxTime = mainSequenceConfig["endTime"].at(-1);

  const margin = {
    b: 100,
    l: 100,
    r: 100,
    t: 160,
  };
  const plotHeight = RF_HEIGHT * totalChannels + margin.t + margin.b;
  const plotWidth = 1000 + margin.l + margin.r;

  const channelToAxisIdx = [...Array(N_RF_CHANNELS).keys()].reduce(
    ([o, axisIdx], idx) => {
      if (channelEnabled["RF" + idx]) {
        o["RF" + idx] = axisIdx;
        return [o, axisIdx + 1];
      }
      return [o, axisIdx];
    },
    [{}, 0],
  )[0];
  const axisIdxToChannel = [
    ...Array(N_RF_CHANNELS + hasDigitalIo).keys(),
  ].reduce((arr, idx) => {
    if (idx >= N_RF_CHANNELS) {
      arr.push("Digital IO");
    } else if (channelEnabled["RF" + idx]) {
      arr.push("RF" + idx);
    }
    return arr;
  }, {});

  let marks = [];

  for (const [key, sequence] of Object.entries(sequenceConfig)
    .slice(0, -1) // exclude main sequence
    .reverse()) {
    let yDataPairs = [];
    let startYData;
    for (let rf_idx = N_RF_CHANNELS - 1; rf_idx >= 0; --rf_idx) {
      const key = "RF" + rf_idx;
      if (!channelEnabled[key]) continue;
      const i = channelToAxisIdx[key];

      if (startYData === undefined) {
        if ((1 << rf_idx) & sequence["ch_mask"]["rf"]) {
          startYData = i;
        }
      } else if ((1 << rf_idx) & ~sequence["ch_mask"]["rf"]) {
        yDataPairs.push([startYData, i - 1]);
        startYData = undefined;
      }
    }
    if (startYData === undefined) {
      if (sequence["ch_mask"]["digital_io"] && hasDigitalIo) {
        yDataPairs.push([totalChannels - 1, totalChannels - 1]);
      }
    } else {
      yDataPairs.push([
        startYData,
        (sequence["ch_mask"]["digital_io"] && hasDigitalIo) || !hasDigitalIo
          ? totalChannels - 1
          : totalChannels - 2,
      ]);
    }
    console.log(sequence["name"], yDataPairs);
    let sequenceBoxes = [];
    for (const [xData, depth] of sequence["startTime"].map((val, i) => [
      [val, sequence["endTime"][i]],
      sequence["depth"][i],
    ])) {
      for (const yData of yDataPairs) {
        sequenceBoxes.push([
          xData[0] + xPad,
          xData[1] - xPad,
          yData[0] - 1 / 2 + depthYShrink * (depth - 1) + yPad,
          yData[1] + 1 / 2 - depthYShrink * (depth - 1) - yPad,
        ]);
      }
    }
    if (sequenceBoxes.length > 0) {
      marks.push(
        Plot.rect(sequenceBoxes, {
          x1: "0",
          x2: "1",
          y1: "2",
          y2: "3",
          fill: typeToColor[sequence["type"]],
        }),
        Plot.text(
          sequenceBoxes.map((entry) => {
            return {
              x: (entry[0] + entry[1]) / 2,
              y: entry[2] - yPad,
            };
          }),
          {
            text: Object.hasOwn(sequence, "name") ? sequence["name"] : key,
            x: "x",
            y: "y",
            lineAnchor: "top",
            fill: "black",
          },
        ),
      );
    }
  }
  marks.push(
    Plot.ruleY(
      axisIdxToChannel.map((channel, idx) => {
        return {
          axisIdx: idx,
          color: idx == totalChannels - 1 && hasDigitalIo ? "green" : "blue",
        };
      }),
      {
        y: "axisIdx",
        x1: -xPad,
        x2: maxTime,
        stroke: "color",
      },
    ),
  );
  marks.push(
    Plot.ruleY([nChannels["RF"] - 1 / 2 - yPad], {
      x1: -xPad,
      x2: maxTime,
    }),
  );
  marks.push(
    Plot.text(
      axisIdxToChannel.map((channel, idx) => {
        return {
          axisIdx: idx,
          channel: channel,
          color: idx == totalChannels - 1 && hasDigitalIo ? "green" : "blue",
        };
      }),
      {
        text: "channel",
        x: -xPad - 5,
        y: "axisIdx",
        textAnchor: "end",
        fill: "color",
      },
    ),
  );
  const onClick = (event) => {
    console.log("Event: ", event);
    let deepestShape;
    for (const shape of []) {
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

  const plotRef = useRef();

  const plotOptions = {
    marginBottom: margin.b,
    marginTop: margin.t,
    marginLeft: margin.l,
    marginRight: margin.r,
    height: plotHeight,
    width: plotWidth,
    y: {
      grid: true,
      domain: [nChannels["RF"] - 1 / 2 + yPad, -1 / 2 - yPad - hasDigitalIo],
      ticks: 0,
    },
    marks: marks,
  };

  // console.log(plotOptions);

  useEffect(() => {
    if (sequenceConfig === undefined) return;

    const plot = Plot.plot(plotOptions);

    plotRef.current.append(plot);
    return () => plot.remove();
  });

  return <div ref={plotRef} />;
};

export { SequenceBlockPlot };
