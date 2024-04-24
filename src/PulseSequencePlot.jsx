import Plot from "react-plotly.js";
import { useState } from "react";
import { expandToWaveform } from "./SequenceParser";

let TTL_yaxis_params = {
  range: [0, 1.2],
  tickmode: "array", // If "array", the placement of the ticks is set via `tickvals` and the tick text is `ticktext`.
  tickvals: ["", ""],
  fixedrange: true,
};

let RF_amp_yaxis_params = {
  range: [0, 120],
  fixedrange: true,
  title: {
    text: "a",
    font: {
      family: "Courier New, monospace",
      size: 14,
      color: "#7f7f7f",
    },
  },
};

const RF_yaxis_ranges = {
  freq: [0, 500],
  phase: [-360, 360],
  sample: [-120, 120],
};

const RF_freq_yaxis_params = {
  ...RF_amp_yaxis_params,
  range: RF_yaxis_ranges["freq"],
};

let RF_phase_yaxis_params = {
  ...RF_amp_yaxis_params,
  range: RF_yaxis_ranges["phase"],
};
let RF_sample_yaxis_params = {
  ...RF_amp_yaxis_params,
  range: RF_yaxis_ranges["sample"],
};

let xAxisParams = {
  rangemode: "nonnegative",
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

function createLayout(n_channels, xLimits, channelYDataType) {
  // PMT channels are treated as TTL channels here
  const individual_TTL_height = 40;
  const individual_RF_height = 70;
  const pad = 0;

  const margin = {
    b: 100,
    l: 100,
    r: 100,
    t: 100,
  };

  let n_RF_channels = n_channels["RF"];
  let n_TTL_channels = n_channels["PMT"] + n_channels["TTL"];

  let grid_params = {
    rows: 2 * n_RF_channels + n_TTL_channels,
    columns: 1,
    //pattern: "independent",
    //sharedxaxes: true
  };

  let TTL_height = n_TTL_channels * (individual_TTL_height + pad);
  let RF_height = 2 * n_RF_channels * (individual_RF_height + pad) - pad;
  //let total_height = TTL_height + RF_height;
  let total_height = TTL_height + RF_height;
  let normalised_TTL_height = individual_TTL_height / total_height;
  let normalised_RF_height = individual_RF_height / total_height;
  let normalised_pad = pad / total_height;

  let the_layout = {
    width: 1100 + margin.l + margin.r,
    height: total_height + margin.t + margin.b,
    margin: margin,
    grid: grid_params,
    xaxis: {
      range: xLimits,
      rangemode: "nonnegative",
      //fixedrange: true
    },
  };

  let j = 0;
  const total_TTL_height = n_TTL_channels * normalised_TTL_height;
  const baseIdx = n_TTL_channels + 1;
  for (let i = 0; i < n_RF_channels; i++) {
    if (channelYDataType === "freq") {
      the_layout["yaxis" + (baseIdx + j)] =
        structuredClone(RF_freq_yaxis_params);
    } else if (channelYDataType === "phase") {
      the_layout["yaxis" + (baseIdx + j)] = structuredClone(
        RF_phase_yaxis_params,
      );
    } else {
      the_layout["yaxis" + (baseIdx + j)] = structuredClone(
        RF_sample_yaxis_params,
      );
    }
    the_layout["yaxis" + (baseIdx + j)].domain = [
      1 - total_TTL_height - (j + 1) * normalised_RF_height,
      1 - total_TTL_height - j * normalised_RF_height,
    ];
    the_layout["yaxis" + (baseIdx + j)].anchor = "x" + (baseIdx + j);
    j++;
    if (channelYDataType !== "sample") {
      the_layout["yaxis" + (baseIdx + j)] =
        structuredClone(RF_amp_yaxis_params);

      the_layout["yaxis" + (baseIdx + j)].domain = [
        1 - total_TTL_height - (j + 1) * normalised_RF_height,
        1 - total_TTL_height - j * normalised_RF_height,
      ];
      the_layout["yaxis" + (baseIdx + j)].anchor = "x" + (baseIdx + j);
      j++;
    }
  }

  for (let i = 0; i < n_TTL_channels; i++) {
    const axisIdx = i + 1;
    the_layout["yaxis" + axisIdx] = structuredClone(TTL_yaxis_params);
    the_layout["yaxis" + axisIdx].domain = [
      1 - (i + 1) * normalised_TTL_height,
      1 - i * normalised_TTL_height,
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
  fill: "tozeroy",
};

let data_template_amp = {
  line: { shape: "hv" },
  type: "scatter",
  mode: "lines+markers",
  marker: { color: "blue" },
  showlegend: false,
  fill: "tozeroy",
};

let data_template_phase = structuredClone(data_template_freq);
data_template_phase.marker.color = "orange";

let data_templates = {
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
    fill: "none",
  },
};

let title_template = {
  text: "Ch",
  font: {
    family: "Courier New, monospace",
    size: 18,
    color: "#7f7f7f",
  },
};

const PulseSequencePlot = function SequencePlot({
  channelDescription,
  channelEnabled,
  sequenceData,
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
  let n_channels = Object.keys(channelDescription).reduce(
    (a, key) => {
      a[channelDescription[key].group] += channelEnabled[key] == true;
      return a;
    },
    { RF: 0, TTL: 0, PMT: 0 },
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
  let layout_to_use = createLayout(n_channels, xLimits, channelYDataType);
  layout_to_use.annotations = [];
  layout_to_use.shapes = [];

  for (const [channel, value] of Object.entries(sequenceData)) {
    if (
      channelDescription[channel].group === "TTL" &&
      channelEnabled[channel]
    ) {
      let TTL_to_add = Object.assign({}, data_template_TTL);
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
        xanchor: "right",
        yanchor: "middle",
        xref: "paper",
        yref: "paper",
        x: -0.01,
        y: annotation_position,
        text: channelDescription[channel].name,
        showarrow: false,
        //textangle: -90,
        //captureevents: true
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
      let PMT_to_add = Object.assign({}, data_template_PMT);
      PMT_to_add.x = value.time;
      PMT_to_add.y = value.values;
      PMT_to_add.text = compileEventName(value.names);

      let annotation_position_2 = layout_to_use["yaxis" + index].domain[0];
      let annotation_position_1 = layout_to_use["yaxis" + index].domain[1];
      let annotation_position =
        (annotation_position_1 + annotation_position_2) / 2;
      let annotation_to_add = {
        xanchor: "right",
        yanchor: "middle",
        xref: "paper",
        yref: "paper",
        x: -0.01,
        y: annotation_position,
        text: channel,
        showarrow: false,
        //textangle: -90,
        //captureevents: true
      };
      layout_to_use.annotations.push(annotation_to_add);

      PMT_to_add.yaxis = "y" + index;
      index++;
      data.push(PMT_to_add);
    }

  let channel_idx = 0;
  for (const [channel, value] of Object.entries(sequenceData)) {
    if (channelDescription[channel].group === "RF" && channelEnabled[channel]) {
      let object_to_add = {
        ...data_templates[channelYDataType[channel]],
      };
      if (channelYDataType[channel] === "sample") {
        const waveform = expandToWaveform(value);

        object_to_add.x = waveform[0];
        object_to_add.y = waveform[1];
      } else {
        object_to_add.x = value.time;
        object_to_add.y = value[channelYDataType[channel]];
        object_to_add.text = compileEventName(value.names);
      }
      object_to_add.name = channel;
      object_to_add.yaxis = "y" + index;

      layout_to_use["yaxis" + index].title.text = channelYDataType[channel];
      layout_to_use["yaxis" + index].range =
        RF_yaxis_ranges[channelYDataType[channel]];
      layout_to_use["xaxis" + index] = {
        ...xAxisParams,
        range: xLimits,
      };

      let annotation_position_1 = layout_to_use["yaxis" + index].domain[1];
      let annotation_position_2 = layout_to_use["yaxis" + index].domain[0];

      data.push(object_to_add);
      index++;

      if (channelYDataType[channel] !== "sample") {
        let amp_to_add = Object.assign({}, data_templates.amp);
        amp_to_add.x = value.time;
        amp_to_add.y = value.amp;
        amp_to_add.text = compileEventName(value.names);
        amp_to_add.yaxis = "y" + index;

        layout_to_use["yaxis" + index].title.text = "amp";
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
        xanchor: "right",
        yanchor: "middle",
        xref: "paper",
        yref: "paper",
        x: -0.05,
        y: annotation_position,
        text: channelDescription[channel].name,
        showarrow: false,
        textangle: -90,
        captureevents: true,
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

  return (
    <Plot
      data={data}
      layout={layout_to_use}
      onClickAnnotation={onClickAnnotation}
    />
  );
};

export { PulseSequencePlot };
