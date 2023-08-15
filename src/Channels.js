import React from "react";
import Plot from "react-plotly.js";

let TTL_yaxis_params = {
  range: [0, 1.2],
  tickmode: "array", // If "array", the placement of the ticks is set via `tickvals` and the tick text is `ticktext`.
  tickvals: ["", ""],
  fixedrange: true
};

let RF_amp_yaxis_params = {
  range: [0, 120],
  fixedrange: true,
  title: {
    text: "a",
    font: {
      family: "Courier New, monospace",
      size: 14,
      color: "#7f7f7f"
    }
  }
};

let RF_freq_yaxis_params = {
  range: [0, 500],
  fixedrange: true,
  title: {
    text: "a",
    font: {
      family: "Courier New, monospace",
      size: 14,
      color: "#7f7f7f"
    }
  }
};

let xAxisParams = {
  rangemode: "nonnegative"
};


function createLayout(n_RF_channels, n_TTL_channels){

  let individual_TTL_height = 40;
  let individual_RF_height = 70;
  let pad = 0;
  
  let grid_params = {
    rows: 2 * n_RF_channels + n_TTL_channels,
    columns: 1
    //pattern: "independent",
    //sharedxaxes: true
  };

  let TTL_height = n_TTL_channels*(individual_TTL_height+pad);
  let RF_height = 2*n_RF_channels * (individual_RF_height+pad)-pad;
  //let total_height = TTL_height + RF_height;
  let total_height = TTL_height + RF_height;
  let normalised_TTL_height = individual_TTL_height / total_height;
  let normalised_RF_height = individual_RF_height / total_height;
  let normalised_pad = pad/total_height;

  let the_layout = {
    width: 1100,
    height: total_height,
    grid: grid_params,
    xaxis: {
      hola:1,
      rangemode: "nonnegative"
      //fixedrange: true
    }
  }



  for (let i = 1; i < n_RF_channels +1; i++) {
    let j = 2*i+n_TTL_channels;
    let starting_at = (n_TTL_channels)*normalised_TTL_height;
    the_layout["yaxis" + (j -1)] = structuredClone(RF_freq_yaxis_params)
    the_layout["yaxis" + (j -1)].domain = [1-starting_at-(2*i-1)*normalised_RF_height, 1-starting_at-(2*i-2)*normalised_RF_height];
    the_layout["yaxis" + (j -1)].anchor = 'x'+(j-1);
    
    the_layout["yaxis" + (j)] = structuredClone(RF_amp_yaxis_params)
    the_layout["yaxis" + (j)].domain = [1-starting_at-(2*i)*normalised_RF_height, 1-starting_at-(2*i-1)*normalised_RF_height]
    the_layout["yaxis" + (j)].anchor =  'x'+(j);
  };

  for (let i = 1; i < n_TTL_channels +1; i++) {
    
    the_layout["yaxis" + (i)] = structuredClone(TTL_yaxis_params)
    the_layout["yaxis" + (i)].domain = [1 - (i)*normalised_TTL_height, 1-(i-1)*normalised_TTL_height];
    //the_layout["yaxis" + (i)].domain = [1,0.3];
    the_layout["yaxis" + (i)].anchor = 'x'+(i);
    
  }
  return the_layout
};

function filter(object_to_filter, filter){

  const filtered = Object.keys(object_to_filter)
    .filter(key => filter.includes(key))
    .reduce((obj, key) => {
      return {
        ...obj,
        [key]: object_to_filter[key]
      };
    }, {});

    return filtered
}

let RFScope = function statelessFunctionComponentClass(input) {

  let RF_input = filter(input.RF_input, Object.keys(input.rf_names_map));
  let enabled_RFs = filter(input.enabledChannels, Object.keys(input.rf_names_map));
  let n_RF_channels = Object.values(enabled_RFs).reduce((a, item) => a + item, 0)
  
  let enabled_TTLs = filter(input.enabledChannels, Object.keys(input.TTL_names_map));
  let n_TTL_channels = Object.values(enabled_TTLs).reduce((a, item) => a + item, 0) //Count number of enabled TTLs
  let TTL_input = filter(input.RF_input, Object.keys(input.TTL_names_map));
  let rf_names_map = input.rf_names_map;

  let data_template_TTL = {
    line: { shape: "hv" },
    type: "scatter",
    mode: "lines+markers",
    marker: { color: "green" },
    showlegend: false,
    fill: "tozeroy"
  };

  let data_template = {
    line: { shape: "hv" },
    type: "scatter",
    mode: "lines+markers",
    marker: { color: "red" },
    showlegend: false,
    fill: "tozeroy"
  };

  let data_template_amp = {
    line: { shape: "hv" },
    type: "scatter",
    mode: "lines+markers",
    marker: { color: "blue" },
    showlegend: false,
    fill: "tozeroy"
  };

  let title_template = {
    text: "Ch",
    font: {
      family: "Courier New, monospace",
      size: 18,
      color: "#7f7f7f"
    }
  };

  let data = [];
  let index = 1;


let layout_to_use = createLayout(n_RF_channels, n_TTL_channels);
layout_to_use.annotations = []
console.log("LTS", layout_to_use)
console.log(TTL_input)
for (const [channel, value] of Object.entries(TTL_input)){
  if (input.enabledChannels[channel]){ 
  let TTL_to_add = Object.assign({}, data_template_TTL);
  TTL_to_add.x = value.time;
  TTL_to_add.y = value.values;
  //object_to_add.xaxis = "x" + index;
  TTL_to_add.yaxis = "y" + index;
  //TTL_to_add.xaxis = "x" + index;

  // layout["yaxis" + index] = yaxis_params;
  // layout["xaxis" + index] = xAxisParams;

  index++;
  data.push(TTL_to_add);
  }
}
  console.log(input.enabledChannels)
  for (const [channel, value] of Object.entries(RF_input)) {
    if (input.enabledChannels[channel]) {
      let object_to_add = Object.assign({}, data_template);
      object_to_add.x = value.time;
      object_to_add.y = value.freq;
      object_to_add.text = value.names;
      object_to_add.name = "";
      object_to_add.yaxis = "y" + index;
      

      //layout["yaxis" + index] += structuredClone(RF_freq_yaxis_params);
      // layout_to_use["yaxis" + index].title.text = rf_names_map[channel] + "<br>freq";
      console.log(index, layout_to_use["yaxis" + index])
      layout_to_use["yaxis" + index].title.text = "freq";
      layout_to_use["xaxis" + index] = xAxisParams;

      let annotation_position_1 = layout_to_use["yaxis" + index].domain[1]

      data.push(object_to_add);
      index++;

      let amp_to_add = Object.assign({}, data_template_amp);
      amp_to_add.x = value.time;
      amp_to_add.y = value.amp;
      amp_to_add.text = value.names;
      amp_to_add.yaxis = "y" + index;

      // layout["yaxis" + index] = structuredClone(RF_amp_yaxis_params);
      //layout_to_use["yaxis" + index].title.text = rf_names_map[channel] + "<br>amp";
      layout_to_use["yaxis" + index].title.text = "amp";
      layout_to_use["xaxis" + index] = xAxisParams;
      let annotation_position_2 = layout_to_use["yaxis" + index].domain[0]
      let annotation_position = (annotation_position_1 + annotation_position_2)/2
      let annotation_to_add = {
        xanchor: 'right',
        yanchor: 'middle',
        xref: 'paper',
        yref: 'paper',
        x: -0.05,
        y: annotation_position,
        text: rf_names_map[channel],
        showarrow: false,
        textangle: -90
      }
      layout_to_use.annotations.push(annotation_to_add)
      console.log("final", layout_to_use)
      data.push(amp_to_add);
      index++;
    }
  }

  return <Plot data={data} layout={structuredClone(layout_to_use)} />;
};

export {RFScope };
