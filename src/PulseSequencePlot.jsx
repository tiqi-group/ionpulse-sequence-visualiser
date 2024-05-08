import Plot from "react-plotly.js";
import { useState } from "react";
import { N_RF_CHANNELS, expandToWaveform } from "./SequenceParser";
import { ToggleButton, Form, Accordion } from "react-bootstrap";

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
    standoff: 0,
  },
  tickfont: {
    size: 16,
  },
};

const RF_yaxis_ranges = {
  freq: [0, 500],
  phase: [-200, 200],
  sample: [-120, 120],
};

const RF_freq_yaxis_params = {
  ...RF_yaxis_params,
  title: {
    ...RF_yaxis_params["title"],
    text: "f / MHz",
    standoff: 4,
  },
  range: RF_yaxis_ranges["freq"],
  nticks: 3,
};

const RF_phase_yaxis_params = {
  ...RF_yaxis_params,
  title: {
    ...RF_yaxis_params["title"],
    text: "p / °",
    standoff: 0,
  },
  tickvals: [-180, 0, 180],
  range: RF_yaxis_ranges["phase"],
};

const RF_amp_yaxis_params = {
  ...RF_yaxis_params,
  title: {
    ...RF_yaxis_params["title"],
    text: "a / %",
    standoff: 4,
  },
  range: RF_yaxis_ranges["amp"],
  nticks: 3,
};

const RF_sample_yaxis_params = {
  ...RF_yaxis_params,
  title: {
    ...RF_yaxis_params["title"],
    text: "rf / %",
    standoff: 0,
  },
  range: RF_yaxis_ranges["sample"],
  nticks: 3,
};

let xAxisParams = {
  rangemode: "nonnegative",
};

const annotationDefault = {
  xanchor: "right",
  yanchor: "middle",
  xref: "paper",
  yref: "paper",
  x: -0.07,
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
  b: 40,
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
    width: 960 + margin.l + margin.r,
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
          size: 20,
        },
        standoff: 0,
      },
      tickfont: {
        size: 18,
      },
    },
  };

  let j = 0;
  const baseIdx = numberTTLAxes + 1;
  for (let i = 0; i < numberRFAxes; i++) {
    if (channelYDataType[enabledKeys["RF"][i]] === "freq") {
      the_layout["yaxis" + (baseIdx + j)] = {
        ...RF_freq_yaxis_params,
      };
    } else if (channelYDataType[enabledKeys["RF"][i]] === "phase") {
      the_layout["yaxis" + (baseIdx + j)] = {
        ...RF_phase_yaxis_params,
      };
    } else {
      the_layout["yaxis" + (baseIdx + j)] = {
        ...RF_sample_yaxis_params,
      };
    }
    the_layout["yaxis" + (baseIdx + j)].domain = [
      (totalRFHeight - j * (pad + rfAxisHeight) - rfAxisHeight) / totalHeight,
      (totalRFHeight - j * (pad + rfAxisHeight)) / totalHeight,
    ];
    the_layout["yaxis" + (baseIdx + j)].anchor = "x" + (baseIdx + j);
    j++;
    if (channelYDataType[enabledKeys["RF"][i]] !== "sample") {
      the_layout["yaxis" + (baseIdx + j)] = { ...RF_amp_yaxis_params };

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
    the_layout["yaxis" + axisIdx] = {
      ...TTL_yaxis_params,
    };
    the_layout["yaxis" + axisIdx].domain = [
      (totalHeight - i * (pad + ttlAxisHeight) - ttlAxisHeight) / totalHeight,
      (totalHeight - i * (pad + ttlAxisHeight)) / totalHeight,
    ];
    the_layout["yaxis" + axisIdx].anchor = "x" + axisIdx;
  }
  return the_layout;
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
  397: "blue",
  729: "red",
  854: "rgb(70%,0,0)",
  866: "rgb(60%,0,0)",
};
const ampFillColour = {
  397: "rgba(0%,0%,100%,80%)",
  729: "rgb(100%,20%,20%)",
  854: "rgb(80%,20%,20%)",
  866: "rgb(75%,20%,20%)",
};

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

  const [individualRFHeight, setIndividualRFHeight] = useState(75);
  const [individualTTLHeight, setIndividualTTLHeight] = useState(45);
  const [axisPad, setAxisPad] = useState(10);
  const [isAnnotation90, setIsAnnotation90] = useState(true);

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

  sequenceData = filter(sequenceData, Object.keys(channelDescription));
  const enabledKeys = Object.keys(channelDescription).reduce(
    (enabledKeys, key) => {
      if (channelEnabled[key] == true) {
        enabledKeys[channelDescription[key].group].push(key);
      }
      return enabledKeys;
    },
    { RF: [], TTL: [], PMT: [] },
  );

  let xLimits = [0, 0];
  for (const [channel, data] of Object.entries(sequenceData)) {
    if (channelEnabled[channel]) {
      xLimits[1] = Math.max(xLimits[1], data["timeDomain"].at(-1));
    }
  }
  xLimits[0] = xLimits[1];
  for (const [channel, data] of Object.entries(sequenceData)) {
    if (channelEnabled[channel]) {
      xLimits[0] = Math.min(xLimits[0], data["timeDomain"].at(0));
    }
  }

  let data = [];
  let index = 1;
  let layout_to_use = createLayout(
    enabledKeys,
    xLimits,
    channelYDataType,
    individualRFHeight,
    individualTTLHeight,
    axisPad,
  );
  if (isAnnotation90) {
    layout_to_use["margin"]["l"] = margin["l"] - 120;
  }
  layout_to_use.annotations = [];
  layout_to_use.shapes = [];

  for (const [channel, value] of Object.entries(sequenceData)) {
    if (
      channelDescription[channel].group === "TTL" &&
      channelEnabled[channel]
    ) {
      let TTL_to_add = {
        ...data_templates["TTL"],
      };
      TTL_to_add.x = value.time;
      TTL_to_add.y = value.values;
      //object_to_add.xaxis = "x" + index;
      TTL_to_add.yaxis = "y" + index;
      //TTL_to_add.xaxis = "x" + index;
      TTL_to_add.text = compileEventName(value.names);

      // layout["yaxis" + index] = yaxis_params;
      // layout["xaxis" + index] = xAxisParams;

      let annotation_position_2 = layout_to_use["yaxis" + index].domain[0];
      let annotation_position_1 = layout_to_use["yaxis" + index].domain[1];
      let annotation_position =
        (annotation_position_1 + annotation_position_2) / 2;
      let annotation_to_add = {
        ...annotationDefault,
        y: annotation_position,
        text: channelDescription[channel].name,
        textangle: isAnnotation90 ? -90 : 0,
        x: isAnnotation90
          ? annotationDefault["x"]
          : annotationDefault["x"] - axisPad / 100,
      };
      layout_to_use.annotations.push(annotation_to_add);

      index++;
      data.push(TTL_to_add);
    }
  }

  for (const [channel, value] of Object.entries(sequenceData))
    if (
      channelDescription[channel].group === "PMT" &&
      channelEnabled[channel]
    ) {
      let PMT_to_add = {
        ...data_templates["PMT"],
      };
      PMT_to_add.x = value.time;
      PMT_to_add.y = value.values;
      PMT_to_add.text = compileEventName(value.names);

      let annotation_position_2 = layout_to_use["yaxis" + index].domain[0];
      let annotation_position_1 = layout_to_use["yaxis" + index].domain[1];
      let annotation_position =
        (annotation_position_1 + annotation_position_2) / 2;
      let annotation_to_add = {
        ...annotationDefault,
        y: annotation_position,
        text: channel,
        textangle: isAnnotation90 ? -90 : 0,
      };
      layout_to_use.annotations.push(annotation_to_add);

      PMT_to_add.yaxis = "y" + index;
      index++;
      data.push(PMT_to_add);
    }

  let channel_idx = 0;
  for (const [channel, value] of Object.entries(sequenceData)) {
    if (channelDescription[channel].group === "RF" && channelEnabled[channel]) {
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
      object_to_add.name = channelDescription[channel].name;
      object_to_add.yaxis = "y" + index;

      for (const [wavelength, colour] of Object.entries(wavelengthColours)) {
        if (channelDescription[channel].name.includes(wavelength)) {
          object_to_add["marker"]["color"] = colour;
        }
      }

      layout_to_use["xaxis" + index] = {
        ...xAxisParams,
        range: xLimits,
      };

      let annotation_position_1 = layout_to_use["yaxis" + index].domain[1];
      let annotation_position_2 = layout_to_use["yaxis" + index].domain[0];

      data.push(object_to_add);
      index++;

      if (channelYDataType[channel] !== "sample") {
        let amp_to_add = structuredClone(data_templates["amp"]);
        amp_to_add.x = value.time;
        amp_to_add.y = value.amp;
        amp_to_add.text = compileEventName(value.names);
        amp_to_add.yaxis = "y" + index;

        for (const [wavelength, colour] of Object.entries(wavelengthColours)) {
          if (channelDescription[channel].name.includes(wavelength)) {
            amp_to_add["marker"]["color"] = colour;
          }
        }

        layout_to_use["xaxis" + index] = {
          ...xAxisParams,
          range: xLimits,
        };
        annotation_position_2 = layout_to_use["yaxis" + index].domain[0];
        data.push(amp_to_add);
        index++;
      }

      let annotation_position =
        (annotation_position_1 + annotation_position_2) / 2;
      let annotation_to_add = {
        ...annotationDefault,
        y: annotation_position,
        text: channelDescription[channel].name,
        captureevents: true,
        textangle: isAnnotation90 ? -90 : 0,
        x: isAnnotation90
          ? annotationDefault["x"]
          : annotationDefault["x"] - 0.03,
      };
      layout_to_use.annotations.push(annotation_to_add);

      if (channel_idx % 2 == 1) {
        let shape_to_add = {
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
      channel_idx++;
    }
  }

  // Create Loop/Fork annotations (repeat and branch indicators)

  const loopData = sequenceBlockData.reduce(
    (loopData, sequence) => {
      if (sequence["type"] !== "Loop" || sequence["display"] !== "minimized")
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
        axisIdx += channelYDataType === "sample" ? 1 : 2;
      }
      if (startYData !== undefined) {
        yDataPairs.push([startYData, axisIdx - 1]);
      }

      const yOvershoot = 0.01;

      for (const yDataPair of yDataPairs) {
        loopData["shapes"].push({
          type: "line",
          xref: "x",
          yref: "paper",
          x0: sequence["calls"][0]["startTime"],
          y0: layout_to_use["yaxis" + yDataPair[1]]["domain"][0] - yOvershoot,
          x1: sequence["calls"][0]["startTime"],
          y1: layout_to_use["yaxis" + yDataPair[0]]["domain"][1] + yOvershoot,
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
          x0: sequence["calls"][0]["endTime"],
          y0: layout_to_use["yaxis" + yDataPair[1]]["domain"][0] - yOvershoot,
          x1: sequence["calls"][0]["endTime"],
          y1: layout_to_use["yaxis" + yDataPair[0]]["domain"][1] + yOvershoot,
          opacity: 0.7,
          line: {
            width: 2,
          },
          layer: "above",
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

  return (
    <>
      <Accordion defaultActiveKey="" flush={true}>
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
              type="checkbox"
              value="1"
              variant="outline-secondary"
              checked={isAnnotation90}
              onChange={() => setIsAnnotation90(!isAnnotation90)}
            >
              Rotate Axes annotations
            </ToggleButton>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
      <Plot
        data={data}
        layout={layout_to_use}
        onClickAnnotation={onClickAnnotation}
      />
    </>
  );
};

export { PulseSequencePlot };
