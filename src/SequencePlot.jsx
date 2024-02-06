import Plot from "react-plotly.js";
import { memo, useState } from "react";

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

let RF_freq_yaxis_params = {
  range: [0, 500],
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

let RF_phase_yaxis_params = {
  range: [-360, 360],
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

let RF_yaxis_ranges = {
  freq: [0, 500],
  phase: [-360, 360],
};

let xAxisParams = {
  rangemode: "nonnegative",
};

function compileEventName(eventNames) {
  console.log(eventNames);
  let compiledEventNames = [];
  for (const eventName of eventNames) {
    if (eventName.sequences) {
      compiledEventNames.push(eventName.sequences.join(" "));
    } else {
      compiledEventNames.push("");
    }
  }
  console.log(compiledEventNames);
  return compiledEventNames;
}

function createLayout(n_channels) {
  // PMT channels are treated as TTL channels here
  let individual_TTL_height = 40;
  let individual_RF_height = 70;
  let pad = 0;

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
    width: 1100,
    height: total_height,
    grid: grid_params,
    xaxis: {
      hola: 1,
      rangemode: "nonnegative",
      //fixedrange: true
    },
  };

  for (let i = 1; i < n_RF_channels + 1; i++) {
    let j = 2 * i + n_TTL_channels;
    let starting_at = n_TTL_channels * normalised_TTL_height;
    the_layout["yaxis" + (j - 1)] = structuredClone(RF_freq_yaxis_params);
    the_layout["yaxis" + (j - 1)].domain = [
      1 - starting_at - (2 * i - 1) * normalised_RF_height,
      1 - starting_at - (2 * i - 2) * normalised_RF_height,
    ];
    the_layout["yaxis" + (j - 1)].anchor = "x" + (j - 1);

    the_layout["yaxis" + j] = structuredClone(RF_amp_yaxis_params);
    the_layout["yaxis" + j].domain = [
      1 - starting_at - 2 * i * normalised_RF_height,
      1 - starting_at - (2 * i - 1) * normalised_RF_height,
    ];
    the_layout["yaxis" + j].anchor = "x" + j;
  }

  for (let i = 1; i < n_TTL_channels + 1; i++) {
    the_layout["yaxis" + i] = structuredClone(TTL_yaxis_params);
    the_layout["yaxis" + i].domain = [
      1 - i * normalised_TTL_height,
      1 - (i - 1) * normalised_TTL_height,
    ];
    //the_layout["yaxis" + (i)].domain = [1,0.3];
    the_layout["yaxis" + i].anchor = "x" + i;
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
};

let title_template = {
  text: "Ch",
  font: {
    family: "Courier New, monospace",
    size: 18,
    color: "#7f7f7f",
  },
};

const SequencePlot = function SequencePlot({
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

  let data = [];
  let index = 1;
  let layout_to_use = createLayout(n_channels);
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

  for (const [channel, value] of Object.entries(sequenceData)) {
    if (channelDescription[channel].group === "RF" && channelEnabled[channel]) {
      let object_to_add = Object.assign(
        {},
        data_templates[channelYDataType[channel]],
      );
      object_to_add.x = value.time;
      object_to_add.y = value[channelYDataType[channel]];
      //object_to_add.text = compileEventName(value.names);
      object_to_add.name = "";
      object_to_add.yaxis = "y" + index;

      layout_to_use["yaxis" + index].title.text = channelYDataType[channel];
      layout_to_use["yaxis" + index].range =
        RF_yaxis_ranges[channelYDataType[channel]];
      layout_to_use["xaxis" + index] = xAxisParams;

      let annotation_position_1 = layout_to_use["yaxis" + index].domain[1];

      data.push(object_to_add);
      index++;

      let amp_to_add = Object.assign({}, data_templates.amp);
      amp_to_add.x = value.time;
      amp_to_add.y = value.amp;
      //amp_to_add.text = compileEventName(value.names);
      amp_to_add.yaxis = "y" + index;

      layout_to_use["yaxis" + index].title.text = "amp";
      layout_to_use["xaxis" + index] = xAxisParams;
      let annotation_position_2 = layout_to_use["yaxis" + index].domain[0];
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
      let channel_idx = 0;
      if (index % 2 == 0) {
        channel_idx = index / 2;
      } else {
        channel_idx = (index - 1) / 2;
      }
      if (channel_idx % 2 == 0) {
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
      layout_to_use.annotations.push(annotation_to_add);
      data.push(amp_to_add);
      index++;
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

export { SequencePlot };
