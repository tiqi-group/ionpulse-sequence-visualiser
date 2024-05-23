import * as Plot from "@observablehq/plot";
import { useRef, useEffect } from "react";
import { getNumberOfEnabledChannels, RF_HEIGHT } from "./PlotHelpers";
import { N_RF_CHANNELS } from "./SequenceParser";

import * as d3 from "d3";

const typeToColor = {
  Loop: [
    "color-mix(in srgb, var(--bs-blue) 70%, white)",
    "color-mix(in srgb, var(--bs-blue) 40%, white)",
    "var(--bs-gray-300)",
  ],
  LinearSequence: [
    "color-mix(in srgb, var(--bs-green) 70%, white)",
    "color-mix(in srgb, var(--bs-green) 40%, white)",
    "var(--bs-gray-300)",
  ],
  Fork: [
    "color-mix(in srgb, var(--bs-red) 70%, white)",
    "color-mix(in srgb, var(--bs-red) 40%, white)",
    "var(--bs-gray-300)",
  ],
};

const SequenceBlockPlot = function ({
  channelDescription,
  channelEnabled,
  sequenceBlockData,
  timeDomain,
  plotWidth,
  margin,
  sequenceConfig,
  setSequenceConfig,
}) {
  const nChannels = getNumberOfEnabledChannels(channelEnabled);
  const hasDigitalIo = nChannels["TTL"] + nChannels["PMT"] > 0;
  const totalChannels = nChannels["RF"] + hasDigitalIo;

  const depthYShrink = 1 / 2 / sequenceBlockData.at(-1)["maxDepth"];
  const depthXShrink = 1;
  const xPad = 1;
  const yPad = 0.02;

  const maxTime = sequenceBlockData.at(-1)["calls"].at(-1)["endTime"];

  const plotHeight = RF_HEIGHT * totalChannels + margin.t + margin.b;
  // const plotWidth = 1100 + margin.l + margin.r;

  const channelToAxisIdx = [
    ...Array(N_RF_CHANNELS + hasDigitalIo).keys(),
  ].reduce(
    ([o, axisIdx], idx) => {
      if (idx >= N_RF_CHANNELS) {
        o["Digital IO"] = -1;
      } else if (channelEnabled["RF" + idx]) {
        o["RF" + idx] = axisIdx;
        ++axisIdx;
      }
      return [o, axisIdx];
    },
    [{}, 0],
  )[0]; // Discard axisIdx counter
  const axisIdxToChannel = [
    ...Array(N_RF_CHANNELS + hasDigitalIo).keys(),
  ].reduce(
    ([o, axisIdx], idx) => {
      if (idx >= N_RF_CHANNELS) {
        o[-1] = "Digital IO";
      } else if (channelEnabled["RF" + idx]) {
        o[axisIdx] = "RF" + idx;
        ++axisIdx;
      }
      return [o, axisIdx];
    },
    [{}, 0],
  )[0];

  let marks = [];

  sequenceBlockData
    .slice(0, -1) // exclude main sequence
    .reverse()
    .forEach((sequence, key) => {
      let yDataPairs = [];
      let startYData;
      if (sequence["ch_mask"]["digital_io"] && hasDigitalIo) {
        startYData = channelToAxisIdx["Digital IO"];
      }
      for (let rf_idx = 0; rf_idx < N_RF_CHANNELS; ++rf_idx) {
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
      if (startYData !== undefined) {
        yDataPairs.push([startYData, nChannels["RF"] - 1]);
      }

      let blockData = [];
      for (const call of sequence["calls"]) {
        if (
          call["startTime"] < timeDomain[1] &&
          call["endTime"] > timeDomain[0]
        ) {
          for (const yData of yDataPairs) {
            blockData.push({
              x1: call["startTime"] + xPad + depthXShrink * (call["depth"] - 1), // -1 because we ignore main sequence
              x2: call["endTime"] - xPad - depthXShrink * (call["depth"] - 1),
              y1: yData[0] - 1 / 2 + depthYShrink * (call["depth"] - 1) + yPad,
              y2: yData[1] + 1 / 2 - depthYShrink * (call["depth"] - 1) - yPad,
              name: call["name"],
            });
          }
        }
      }
      if (blockData.length > 0) {
        marks.push(
          on(
            Plot.rect(blockData, {
              ariaDescription: "Rectangle plot of sequence " + sequence["name"],
              x1: "x1",
              x2: "x2",
              y1: "y1",
              y2: "y2",
              fill:
                !sequenceConfig[sequence["name"]] ||
                sequenceConfig[sequence["name"]]["display"] === "full"
                  ? typeToColor[sequence["type"]][0]
                  : sequenceConfig[sequence["name"]]["display"] === "minimized"
                    ? typeToColor[sequence["type"]][1]
                    : typeToColor[sequence["type"]][2],
            }),
            {
              pointerenter: function (event, { mark }) {
                mark
                  .style("cursor", "pointer")
                  .style("stroke", "var(--bs-red)")
                  .style("stroke-width", "3px");
              },
              pointerout: function (event, { mark }) {
                mark.style("cursor", "pointer").style("stroke", null);
              },
              click: function (event, { mark }) {
                setSequenceConfig((cfg) => {
                  if (Object.hasOwn(cfg, sequence["name"])) {
                    cfg[sequence["name"]]["display"] =
                      cfg[sequence["name"]]["display"] === "full"
                        ? "minimized"
                        : cfg[sequence["name"]]["display"] === "minimized"
                          ? "hide"
                          : "full";
                  } else {
                    cfg[sequence["name"]] = { display: "minimized" };
                  }
                  return cfg;
                });
              },
            },
          ),
          Plot.text(
            blockData.map((entry) => {
              return {
                x: (entry["x1"] + entry["x2"]) / 2,
                y: entry["y1"] + 2 * yPad,
                name: entry["name"],
              };
            }),
            {
              text: "name",
              x: "x",
              y: "y",
              lineAnchor: "top",
              fill: "black",
              pointerEvents: "none",
            },
          ),
        );
      }
    });
  marks.push(
    Plot.ruleY(
      Object.keys(axisIdxToChannel).map((axisIdx) => {
        return {
          axisIdx: axisIdx,
          color: axisIdxToChannel[axisIdx] == "Digital IO" ? "green" : "blue",
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
      Object.keys(axisIdxToChannel).map((axisIdx) => {
        return {
          axisIdx: axisIdx,
          channel: axisIdxToChannel[axisIdx],
          color: axisIdxToChannel[axisIdx] == "Digital IO" ? "green" : "blue",
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
    x: {
      domain: timeDomain,
    },
    marks: marks,
  };

  useEffect(() => {
    if (sequenceConfig === undefined) return;

    const plot = Plot.plot(plotOptions);

    plotRef.current.append(plot);
    return () => plot.remove();
  });

  return <div style={{ height: plotHeight }} ref={plotRef} />;
};

// See https://observablehq.com/@fil/plot-onclick-experimental-plugin
// TODO revise with Plot’s render transform (0.6.10)
function on(mark, listeners = {}) {
  const render = mark.render;
  mark.render = function (facet, { x, y }, channels) {
    // 🌶 I'd like to be allowed to read the facet
    // …  mutable debug = fx.domain()??

    // 🌶 dat[i] may or may not be the data used for the current mark element, depending on transforms
    // (at this stage we only have access to the materialized channels we requested)
    // but in simple cases it works
    const data = this.data;

    // 🌶 since a point or band scale doesn't have an inverse, create one from its domain and range
    if (x && x.invert === undefined)
      x.invert = d3.scaleQuantize(x.range(), x.domain());
    if (y && y.invert === undefined)
      y.invert = d3.scaleQuantize(y.range(), y.domain());

    const g = render.apply(this, arguments);
    const r = d3.select(g).selectChildren();
    for (const [type, callback] of Object.entries(listeners)) {
      r.on(type, function (event, i) {
        const p = d3.pointer(event, g);
        callback(event, {
          type,
          p,
          mark: r,
          i,
          facet,
          data,
          ...(x && { x: x.invert(p[0]) }),
          ...(y && { y: y.invert(p[1]) }),
          ...(x && channels.x2 && { x2: x.invert(channels.x2[i]) }),
          ...(y && channels.y2 && { y2: y.invert(channels.y2[i]) }),
        });
      });
    }
    return g;
  };
  return mark;
}

export default SequenceBlockPlot;
