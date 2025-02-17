import { useState, useEffect, useRef } from "react";
import { N_RF_CHANNELS, expandToWaveform } from "./SequenceParser";
import { Button, ToggleButton, Form, Accordion } from "react-bootstrap";
import Plotly from "plotly.js-basic-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";
const Plot = createPlotlyComponent(Plotly);

let TTL_yaxis_params = {
  range: [0, 1.2],
  tickmode: "array", // If "array", the placement of the ticks is set via `tickvals` and the tick text is `ticktext`.
  tickvals: ["", ""],
  fixedrange: true,
};

const RF_yaxis_params = {
  fixedrange: true,
  title: {
    font: {
      // family: "Courier New, monospace",
      size: 16,
      // color: "gray",
    },
  },
  tickfont: {
    size: 16,
  },
};

const RF_yaxis_ranges = {
  freq: [0, 500],
  phase: [-200, 200],
  amp: [0, 110],
  sample: [-120, 120],
};

const RF_freq_yaxis_params = {
  ...RF_yaxis_params,
  title: {
    ...RF_yaxis_params["title"],
    text: "f / MHz",
  },
  range: RF_yaxis_ranges["freq"],
  nticks: 3,
};

const RF_phase_yaxis_params = {
  ...RF_yaxis_params,
  title: {
    ...RF_yaxis_params["title"],
    text: "p / °",
  },
  tickvals: [-180, 0, 180],
  range: RF_yaxis_ranges["phase"],
};

const RF_amp_yaxis_params = {
  ...RF_yaxis_params,
  title: {
    ...RF_yaxis_params["title"],
    text: "a / %",
  },
  range: RF_yaxis_ranges["amp"],
  nticks: 3,
};

const RF_sample_yaxis_params = {
  ...RF_yaxis_params,
  title: {
    ...RF_yaxis_params["title"],
    text: "rf / %",
  },
  range: RF_yaxis_ranges["sample"],
  nticks: 3,
};

const rfYaxisParams = {
  freq: RF_freq_yaxis_params,
  phase: RF_phase_yaxis_params,
  amp: RF_amp_yaxis_params,
  sample: RF_sample_yaxis_params,
};

let xAxisParams = {
  rangemode: "nonnegative",
};

const axisAnnotationDefaultBase = {
  xanchor: "right",
  yanchor: "middle",
  xref: "paper",
  yref: "paper",
  x: -70,
  showarrow: false,
  // textangle: -90,
  captureevents: false,
  font: {
    size: 18,
  },
};

function compileEventName(eventNames) {
  let compiledEventNames = [];
  if (eventNames) {
    for (const eventName of eventNames) {
      if (eventName) {
        compiledEventNames.push(eventName.join("->"));
      } else {
        compiledEventNames.push("");
      }
    }
  }
  return compiledEventNames;
}

const margin = {
  b: 50,
  l: 230,
  r: 0,
  t: 40,
};

function createLayout(
  enabledKeys,
  xLimits,
  channelYDataType,
  rfAxisHeight,
  ttlAxisHeight,
  pad,
  isPlotMode,
) {
  let numberRFAxes = 0;
  for (const key of enabledKeys["RF"]) {
    numberRFAxes += channelYDataType[key] === "sample" ? 1 : 2;
  }

  // PMT channels are treated as TTL channels here
  const numberTTLAxes = enabledKeys["PMT"].length + enabledKeys["TTL"].length;

  const grid_params = {
    rows: numberRFAxes + numberTTLAxes,
    columns: 1,
    //pattern: "independent",
    //sharedxaxes: true
  };

  const totalTTLHeight = numberTTLAxes * (ttlAxisHeight + pad);
  const totalRFHeight = numberRFAxes * (rfAxisHeight + pad) - pad;
  const totalHeight = totalTTLHeight + totalRFHeight;

  let the_layout = {
    width: window.innerWidth - 100,
    height: totalHeight + margin.t + margin.b,
    margin: {
      ...margin,
    },
    grid: grid_params,
    xaxis: {
      range: xLimits,
      rangemode: "nonnegative",
      //fixedrange: true
      title: {
        text: "time / μs",
        font: {
          size: isPlotMode ? 20 : 20,
        },
        // Always constrained to bottom margin
        standoff: isPlotMode ? 100 : 40,
      },
      tickfont: {
        size: 18,
      },
    },
  };

  let channelToAxisIdx = {};

  let j = 0;
  const baseIdx = numberTTLAxes + 1;
  for (let i = 0; i < numberRFAxes; i++) {
    const channel = enabledKeys["RF"][i];
    channelToAxisIdx[channel] = [baseIdx + j];
    const yDataType = channelYDataType[enabledKeys["RF"][i]] || "freq";
    the_layout["yaxis" + (baseIdx + j)] = {
      ...rfYaxisParams[yDataType],
    };
    const isFreq = yDataType === "freq";
    if (isPlotMode) {
      the_layout["yaxis" + (baseIdx + j)]["standoff"] = isFreq ? 10 : 5;
      the_layout["yaxis" + (baseIdx + j)]["title"]["font"]["size"] = 18;
    } else {
      the_layout["yaxis" + (baseIdx + j)]["standoff"] = isFreq ? 4 : 0;
      the_layout["yaxis" + (baseIdx + j)]["title"]["font"]["size"] = 16;
    }
    the_layout["yaxis" + (baseIdx + j)].domain = [
      (totalRFHeight - j * (pad + rfAxisHeight) - rfAxisHeight) / totalHeight,
      (totalRFHeight - j * (pad + rfAxisHeight)) / totalHeight,
    ];
    the_layout["yaxis" + (baseIdx + j)].anchor = "x" + (baseIdx + j);
    j++;
    if (yDataType !== "sample") {
      channelToAxisIdx[channel].push(baseIdx + j);
      the_layout["yaxis" + (baseIdx + j)] = { ...RF_amp_yaxis_params };
      if (isPlotMode) {
        the_layout["yaxis" + (baseIdx + j)]["standoff"] = 10;
        the_layout["yaxis" + (baseIdx + j)]["title"]["font"]["size"] = 18;
      } else {
        the_layout["yaxis" + (baseIdx + j)]["standoff"] = 5;
        the_layout["yaxis" + (baseIdx + j)]["title"]["font"]["size"] = 16;
      }

      the_layout["yaxis" + (baseIdx + j)].domain = [
        (totalRFHeight - j * (pad + rfAxisHeight) - rfAxisHeight) / totalHeight,
        (totalRFHeight - j * (pad + rfAxisHeight)) / totalHeight,
      ];
      the_layout["yaxis" + (baseIdx + j)].anchor = "x" + (baseIdx + j);
      j++;
    }
  }

  for (let i = 0; i < numberTTLAxes; i++) {
    const axisIdx = i + 1;
    if (i < enabledKeys["TTL"].length) {
      channelToAxisIdx[enabledKeys["TTL"][i]] = [axisIdx];
    } else {
      channelToAxisIdx[enabledKeys["PMT"][i - enabledKeys["TTL"].length]] = [
        axisIdx,
      ];
    }
    the_layout["yaxis" + axisIdx] = {
      ...TTL_yaxis_params,
    };
    the_layout["yaxis" + axisIdx].domain = [
      (totalHeight - i * (pad + ttlAxisHeight) - ttlAxisHeight) / totalHeight,
      (totalHeight - i * (pad + ttlAxisHeight)) / totalHeight,
    ];
    the_layout["yaxis" + axisIdx].anchor = "x" + axisIdx;
  }
  return [the_layout, channelToAxisIdx, numberRFAxes];
}

function filter(object_to_filter, filter) {
  const filtered = Object.keys(object_to_filter)
    .filter((key) => filter.includes(key))
    .reduce((obj, key) => {
      return {
        ...obj,
        [key]: object_to_filter[key],
      };
    }, {});

  return filtered;
}

let data_template_TTL = {
  line: { shape: "hv" },
  type: "scatter",
  mode: "lines+markers",
  marker: { color: "green" },
  showlegend: false,
  fill: "tozeroy",
};

let data_template_PMT = structuredClone(data_template_TTL);
data_template_PMT.marker.color = "lightblue";

let data_template_freq = {
  line: { shape: "hv" },
  type: "scatter",
  mode: "lines+markers",
  marker: { color: "red" },
  showlegend: false,
  fill: "none",
};

let data_template_amp = {
  line: { shape: "hv" },
  type: "scatter",
  mode: "lines+markers",
  marker: { color: "blue" },
  showlegend: false,
  fill: "tozeroy",
};

const data_template_phase = structuredClone(data_template_freq);
data_template_phase.marker.color = "orange";

const data_templates = {
  freq: data_template_freq,
  amp: data_template_amp,
  phase: data_template_phase,
  PMT: data_template_PMT,
  TTL: data_template_TTL,
  sample: {
    type: "scatter",
    mode: "lines",
    marker: {
      color: "green",
      size: 2,
    },
    showlegend: false,
    fill: "none",
  },
};

const wavelengthColours = {
  397: "rgba(0%,0%,100%,1)",
  729: "rgba(100%,0%,0%,1)",
  854: "rgba(70%,0%,0%, 1)",
  866: "rgba(60%,0%,0%, 1)",
};

function setOpacity(cString, opacity) {
  return cString.replace("1)", "" + opacity + ")");
}

const PulseSequencePlot = function SequencePlot({
  channelDescription,
  channelEnabled,
  sequenceData,
  sequenceBlockData,
}) {
  const [channelYDataType, setChannelYDataType] = useState(() => {
    let init = {};
    for (const k in channelDescription) {
      if (k.includes("RF")) {
        // Extend channels settings
        init[k] = "freq";
      }
    }
    return init;
  });
  const [figureConfig, setFigureConfig] = useState({});

  const [individualRFHeight, setIndividualRFHeight] = useState(75);
  const [individualTTLHeight, setIndividualTTLHeight] = useState(45);
  const [axisPad, setAxisPad] = useState(10);
  const [isAnnotation90, setIsAnnotation90] = useState(true);
  const [isPlotMode, setIsPlotMode] = useState(false);

  const channelYDataTypeKeys = Object.keys(channelYDataType);
  const channelDescKeys = Object.keys(channelDescription);
  const allKeys = channelYDataTypeKeys.concat(channelDescKeys);
  const union = new Set(allKeys);

  if (union.size !== channelYDataTypeKeys.length) {
    let newChannelYDataType = { ...channelYDataType };
    for (const k of channelDescKeys) {
      if (!(k in channelYDataType)) {
        newChannelYDataType[k] = "freq";
      }
    }
    setChannelYDataType(newChannelYDataType);
  }

  function onClickAnnotation(e) {
    let channel = Object.keys(channelDescription).find(
      (key) => channelDescription[key].name === e.annotation.text,
    );

    let newChannelYDataType = { ...channelYDataType };
    if (newChannelYDataType[channel] == "freq") {
      newChannelYDataType[channel] = "phase";
    } else if (newChannelYDataType[channel] == "phase") {
      newChannelYDataType[channel] = "sample";
    } else {
      newChannelYDataType[channel] = "freq";
    }

    setChannelYDataType(newChannelYDataType);
  }

  const plotData = Object.fromEntries(
    Object.entries(channelDescription).map(([key, desc]) => {
      // TODO: Add support for multi hw channel operations (subtract/add etc.)
      let channelData;
      if (Object.hasOwn(desc, "sub_channel")) {
        const type = desc["group"] === "TTL" ? "output" : "pmts";
        let last = 0;
        channelData = {
          names: sequenceData[desc["hw_channels"][0]]["names"],
          time: sequenceData[desc["hw_channels"][0]]["time"],
          timeDomain: sequenceData[desc["hw_channels"][0]]["timeDomain"],
          values: sequenceData[desc["hw_channels"][0]][type].map(
            ((last = 0),
            (vals) => {
              const mask =
                (sequenceData[desc["hw_channels"][0]][type + "_mask"] &
                  (1 << desc["sub_channel"])) !==
                0;
              const val = (vals & (1 << desc["sub_channel"])) !== 0;
              console.assert(
                !(val & !mask),
                `${desc["group"]} channel ${desc["sub_channel"]} value is ${val} but mask is ${mask}`,
              );
              return (last = (last & mask) | val);
            }),
          ),
        };
      } else {
        channelData = sequenceData[desc["hw_channels"][0]];
      }
      return [key, channelData];
    }),
  );
  const enabledKeys = Object.keys(channelDescription).reduce(
    (enabledKeys, key) => {
      if (channelEnabled[key] == true) {
        enabledKeys[channelDescription[key].group].push(key);
      }
      return enabledKeys;
    },
    { RF: [], TTL: [], PMT: [] },
  );

  let dataXLimits = [0, 0];
  for (const [channel, data] of Object.entries(plotData)) {
    if (channelEnabled[channel]) {
      dataXLimits[1] = Math.max(dataXLimits[1], data["timeDomain"].at(-1));
    }
  }
  dataXLimits[0] = dataXLimits[1];
  for (const [channel, data] of Object.entries(plotData)) {
    if (channelEnabled[channel]) {
      dataXLimits[0] = Math.min(dataXLimits[0], data["timeDomain"].at(0));
    }
  }

  const lastDataXLimits = useRef(dataXLimits);

  const [xLimits, setXLimits] = useState(() => {
    return JSON.parse(sessionStorage.getItem("xLimits")) || dataXLimits;
  });
  useEffect(() => {
    sessionStorage.setItem("xLimits", JSON.stringify(xLimits));
  }, [xLimits]);

  let data = [];
  let [layout_to_use, channelToAxisIdx, numberRFAxes] = createLayout(
    enabledKeys,
    xLimits.slice(),
    channelYDataType,
    individualRFHeight,
    individualTTLHeight,
    axisPad,
    isPlotMode,
  );
  if (isAnnotation90) {
    layout_to_use["margin"]["l"] = margin["l"] - 120;
  }
  layout_to_use.annotations = [];
  layout_to_use.shapes = [];
  layout_to_use.uirevision = "true";

  const axisAnnotationDefault = {
    ...axisAnnotationDefaultBase,
    font: {
      size: isPlotMode ? 20 : 18,
    },
  };

  for (const [channel, value] of Object.entries(plotData)) {
    if (channelEnabled[channel] && channelDescription[channel].group !== "RF") {
      const index = channelToAxisIdx[channel][0];
      let trace = {
        ...data_templates[channelDescription[channel].group],
      };
      trace.x = value.time;
      trace.y = value.values;
      //object_to_add.xaxis = "x" + index;
      trace.yaxis = "y" + index;
      //trace.xaxis = "x" + index;
      trace.text = compileEventName(value.names);

      // layout["yaxis" + index] = yaxis_params;
      // layout["xaxis" + index] = xAxisParams;

      let annotation_position_2 = layout_to_use["yaxis" + index].domain[0];
      let annotation_position_1 = layout_to_use["yaxis" + index].domain[1];
      let annotation_position =
        (annotation_position_1 + annotation_position_2) / 2;
      let annotation_to_add = {
        ...axisAnnotationDefault,
        y: annotation_position,
        text: channelDescription[channel].name,
        textangle: isAnnotation90 ? -90 : 0,
        x:
          (axisAnnotationDefault["x"] +
            (isAnnotation90 ? 0 : isPlotMode ? -50 : -15)) /
          layout_to_use.width,
      };
      layout_to_use.annotations.push(annotation_to_add);

      data.push(trace);
    }
  }

  let axisGroupedWithPrevious = new Array(numberRFAxes).fill(false);

  for (const [channel, value] of Object.entries(plotData)) {
    if (channelDescription[channel].group === "RF" && channelEnabled[channel]) {
      const index = channelToAxisIdx[channel][0];
      let object_to_add = structuredClone(
        data_templates[channelYDataType[channel]],
      );
      if (channelYDataType[channel] === "sample") {
        const waveform = expandToWaveform(value);
        object_to_add.x = waveform[0];
        object_to_add.y = waveform[1];

        for (const [wavelength, colour] of Object.entries(wavelengthColours)) {
          if (channelDescription[channel].name.includes(wavelength)) {
            object_to_add["marker"]["color"] = colour;
          }
        }
      } else {
        object_to_add.x = value.time;
        object_to_add.y = value[channelYDataType[channel]];
        object_to_add.text = compileEventName(value.names);

        for (const [wavelength, colour] of Object.entries(wavelengthColours)) {
          if (channelDescription[channel].name.includes(wavelength)) {
            object_to_add["marker"]["color"] = colour;
          }
        }
      }
      object_to_add.name =
        channelDescription[channel].name + " " + channelYDataType[channel];
      object_to_add.yaxis = "y" + index;

      for (const [wavelength, colour] of Object.entries(wavelengthColours)) {
        if (channelDescription[channel].name.includes(wavelength)) {
          object_to_add["marker"]["color"] = colour;
        }
      }

      layout_to_use["xaxis" + index] = {
        ...xAxisParams,
        range: xLimits.slice(),
      };

      let annotation_position_1 = layout_to_use["yaxis" + index].domain[1];
      let annotation_position_2 = layout_to_use["yaxis" + index].domain[0];

      data.push(object_to_add);

      if (channelYDataType[channel] !== "sample") {
        const index = channelToAxisIdx[channel][1];
        axisGroupedWithPrevious[index] = true;
        let amp_to_add = structuredClone(data_templates["amp"]);
        amp_to_add.x = value.time;
        amp_to_add.y = value.amp;
        amp_to_add.text = compileEventName(value.names);
        amp_to_add.yaxis = "y" + index;
        amp_to_add.name = channelDescription[channel].name + " amp";

        for (const [wavelength, colour] of Object.entries(wavelengthColours)) {
          if (channelDescription[channel].name.includes(wavelength)) {
            amp_to_add["marker"]["color"] = colour;
            amp_to_add["fillcolor"] = setOpacity(colour, 0.5);
          }
        }

        layout_to_use["xaxis" + index] = {
          ...xAxisParams,
          range: xLimits.slice(),
        };
        annotation_position_2 = layout_to_use["yaxis" + index].domain[0];
        data.push(amp_to_add);
      }

      let annotation_position =
        (annotation_position_1 + annotation_position_2) / 2;
      let annotation_to_add = {
        ...axisAnnotationDefault,
        y: annotation_position,
        text: channelDescription[channel].name,
        captureevents: true,
        textangle: isAnnotation90 ? -90 : 0,
        x:
          (axisAnnotationDefault["x"] +
            (isAnnotation90 ? 0 : isPlotMode ? -30 : -15)) /
          layout_to_use.width,
      };
      layout_to_use.annotations.push(annotation_to_add);
    }
  }

  let greyBackground = true;
  for (let i = 0; i < numberRFAxes; i++) {
    greyBackground ^= !axisGroupedWithPrevious[i];
    if (greyBackground) {
      const annotation_position_1 = axisGroupedWithPrevious[i]
        ? layout_to_use["yaxis" + (i - 1)].domain[0]
        : layout_to_use["yaxis" + i].domain[1];
      const annotation_position_2 = layout_to_use["yaxis" + i].domain[0];
      const shape_to_add = {
        type: "rect",
        xref: "paper",
        yref: "paper",
        x0: 0,
        y0: annotation_position_1,
        x1: 1,
        y1: annotation_position_2,
        fillcolor: "#d3d3d3",
        opacity: 0.7,
        line: {
          width: 0,
        },
        layer: "below",
      };
      layout_to_use.shapes.push(shape_to_add);
    }
  }

  // Create Loop/Fork annotations (repeat and branch indicators)

  const loopData = sequenceBlockData.reduce(
    (loopData, sequence) => {
      if (
        sequence["type"] !== "Loop" ||
        (sequence["display"] !== "minimized" &&
          sequence["display"] !== "contracted")
      )
        return loopData;

      // Create array of pairs with axis indices
      // Note that the index 1 is the axis with the largest y value
      let yDataPairs = [];
      let startYData;
      if (
        sequence["ch_mask"]["digital_io"] &&
        (enabledKeys["TTL"].length || enabledKeys["PMT"])
      ) {
        startYData = 1;
      }
      let axisIdx = enabledKeys["TTL"].length + enabledKeys["PMT"].length + 1;
      for (let rf_idx = 0; rf_idx < N_RF_CHANNELS; ++rf_idx) {
        const key = "RF" + rf_idx;
        if (!channelEnabled[key]) continue;
        if (startYData === undefined) {
          if ((1 << rf_idx) & sequence["ch_mask"]["rf"]) {
            startYData = axisIdx;
          }
        } else if ((1 << rf_idx) & ~sequence["ch_mask"]["rf"]) {
          yDataPairs.push([startYData, axisIdx - 1]);
          startYData = undefined;
        }
        axisIdx += channelYDataType[key] === "sample" ? 1 : 2;
      }
      if (startYData !== undefined) {
        yDataPairs.push([startYData, axisIdx - 1]);
      }

      const yOvershoot = 0.01;
      const xPad = 0;

      for (const yDataPair of yDataPairs) {
        const y0 =
          layout_to_use["yaxis" + yDataPair[1]]["domain"][0] - yOvershoot;
        const y1 =
          layout_to_use["yaxis" + yDataPair[0]]["domain"][1] + yOvershoot;
        loopData["shapes"].push({
          type: "line",
          xref: "x",
          yref: "paper",
          x0: sequence["calls"][0]["startTime"] - xPad,
          y0: y0,
          x1: sequence["calls"][0]["startTime"] - xPad,
          y1: y1,
          opacity: 0.7,
          line: {
            width: 2,
          },
          layer: "above",
        });
        loopData["shapes"].push({
          type: "line",
          xref: "x",
          yref: "paper",
          x0: sequence["calls"][0]["endTime"] + xPad,
          y0: y0,
          x1: sequence["calls"][0]["endTime"] + xPad,
          y1: y1,
          opacity: 0.7,
          line: {
            width: 2,
          },
          layer: "above",
        });
        loopData["annotations"].push({
          font: {
            size: 18,
          },
          showarrow: false,
          xanchor: "left",
          yanchor: "bottom",
          xref: "x",
          yref: "paper",
          x: sequence["calls"][0]["endTime"],
          y: y1,
          text: "x " + sequence["iterations"],
        });
      }

      return loopData;
    },
    { shapes: [], annotations: [] },
  );
  layout_to_use.shapes = layout_to_use.shapes.concat(loopData["shapes"]);
  layout_to_use.annotations = layout_to_use.annotations.concat(
    loopData["annotations"],
  );

  sequenceBlockData.forEach((sequence) => {
    if (
      sequence["type"] === "Loop" &&
      (sequence["display"] === "minimized" ||
        sequence["display"] === "contracted")
    ) {
      for (const call of sequence["calls"]) {
        for (const [channel, value] of Object.entries(call["data"])) {
          if (
            channelDescription[channel].group === "RF" &&
            channelEnabled[channel]
          ) {
            const index = channelToAxisIdx[channel][0];
            let object_to_add = structuredClone(
              data_templates[channelYDataType[channel]],
            );
            const localData = {
              ...value,
              time: value.time.map((t) => {
                return (
                  t - (call["startTime"] - sequence["calls"][0]["startTime"])
                  // t
                );
              }),
            };

            if (channelYDataType[channel] === "sample") {
              const waveform = expandToWaveform(localData);
              object_to_add.x = waveform[0];
              object_to_add.y = waveform[1];

              for (const [wavelength, colour] of Object.entries(
                wavelengthColours,
              )) {
                if (channelDescription[channel].name.includes(wavelength)) {
                  object_to_add["marker"]["color"] = colour;
                }
              }
            } else {
              object_to_add.x = localData.time;
              object_to_add.y = localData[channelYDataType[channel]];
              object_to_add.text = compileEventName(value.names);

              for (const [wavelength, colour] of Object.entries(
                wavelengthColours,
              )) {
                if (channelDescription[channel].name.includes(wavelength)) {
                  object_to_add["marker"]["color"] = colour;
                }
              }
            }
            object_to_add.name =
              channelDescription[channel].name + channelYDataType[channel];
            object_to_add.yaxis = "y" + index;

            for (const [wavelength, colour] of Object.entries(
              wavelengthColours,
            )) {
              if (channelDescription[channel].name.includes(wavelength)) {
                object_to_add["marker"]["color"] = colour;
              }
            }

            data.push(object_to_add);

            if (channelYDataType[channel] !== "sample") {
              const index = channelToAxisIdx[channel][1];
              let amp_to_add = structuredClone(data_templates["amp"]);
              amp_to_add.x = localData.time;
              amp_to_add.y = localData.amp;
              amp_to_add.text = compileEventName(value.names);
              amp_to_add.yaxis = "y" + index;
              amp_to_add.name = channelDescription[channel].name + " amp";

              for (const [wavelength, colour] of Object.entries(
                wavelengthColours,
              )) {
                if (channelDescription[channel].name.includes(wavelength)) {
                  amp_to_add["marker"]["color"] = colour;
                  amp_to_add["fillcolor"] = setOpacity(
                    colour,
                    0.5 / sequence["calls"].length,
                  );
                }
              }

              data.push(amp_to_add);
            }
          }
        }
      }
    }
  });

  return (
    <>
      <Accordion defaultActiveKey="" flush={false}>
        <Accordion.Item eventKey="0">
          <Accordion.Header>Plot style control</Accordion.Header>
          <Accordion.Body>
            <Form.Label>TTL height: {individualTTLHeight} px</Form.Label>
            <Form.Range
              aria-label="TTL height"
              min={10}
              step={1}
              max={200}
              defaultValue={individualTTLHeight}
              onChange={(e) => {
                setIndividualTTLHeight(Number(e.target.value));
              }}
            />
            <Form.Label>RF height: {individualRFHeight} px</Form.Label>
            <Form.Range
              aria-label="RF height"
              min={10}
              step={1}
              max={200}
              defaultValue={individualRFHeight}
              onChange={(e) => {
                setIndividualRFHeight(Number(e.target.value));
              }}
            />
            <Form.Label>Axis pad: {axisPad} px</Form.Label>
            <Form.Range
              aria-label="axis pad height"
              defaultValue={axisPad}
              onChange={(e) => {
                setAxisPad(Number(e.target.value));
              }}
            />
            <ToggleButton
              id={"ButtonAnnotation90"}
              className="m-1"
              type="checkbox"
              value="1"
              variant="outline-secondary"
              checked={isAnnotation90}
              onChange={() => setIsAnnotation90(!isAnnotation90)}
            >
              Rotate Axes annotations
            </ToggleButton>
            <ToggleButton
              id={"ButtonPlotMode"}
              className="m-1"
              type="checkbox"
              value="1"
              variant="outline-secondary"
              checked={isPlotMode}
              onChange={() => setIsPlotMode(!isPlotMode)}
            >
              Plot Mode
            </ToggleButton>
            <Button
              variant="primary"
              className="m-1"
              onClick={() => {
                const plotText =
                  document.getElementsByClassName("js-plotly-plot");
                navigator.clipboard.writeText(plotText[0].firstChild.innerHTML);
              }}
            >
              Copy Pulse sequence plot
            </Button>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
      <Plot
        data={data}
        layout={layout_to_use}
        config={figureConfig}
        onInitialized={(figure) => setFigureConfig(figure.config)}
        onUpdate={(figure) => {
          setFigureConfig(figure.config);
          let x = figure.layout.xaxis.range;
          // Adjust whenever we are looking at an interval that is outside
          // of the current data range
          if (
            ((dataXLimits[1] !== lastDataXLimits.current[1] &&
              x[1] > dataXLimits[1]) ||
              (dataXLimits[0] !== lastDataXLimits.current[0] &&
                x[0] < dataXLimits[0])) &&
            dataXLimits[0] !== dataXLimits[1]
          ) {
            x = dataXLimits;
          }
          if (
            (x[0] !== 0 || x[1] !== 0) &&
            (x[0] !== xLimits[0] || x[1] !== xLimits[1])
          ) {
            setXLimits(x);
          }
          lastDataXLimits.current = dataXLimits;
        }}
        onClickAnnotation={onClickAnnotation}
      />
    </>
  );
};

export default PulseSequencePlot;
