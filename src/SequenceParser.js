const ChannelType = {
  quench: "QuenchHardware",
  dds: "DDSHardware",
  dio: "DIOHardware",
  readout: "Readout",
  qubit: "Qubit",
};

const N_INPUT_GATE_CHANNELS = 8;

/**
 * getChannelKey converts hardware channel to a unique string
 *
 * @param {Object} hw An object that specifies the hardware domain "hardware" (DDSHardware, QuenchHardware, DIOHardware, Readout) and optionally the "channel"
 */
function getChannelKey(hw) {
  return hw["device"] + " " + hw["hardware"] + " " + hw["channel"];
}

/**
 * stripIdxFromName removes the optional "[<idx>] " prefix from sequence/event names
 * @param  {string} name Name of the sequence or event
 * @return {string} The name without the prefix or an empty string if name is undefined
 */
function stripIdxFromName(name) {
  if (name === undefined) {
    return "";
  }
  if (name.startsWith("[")) {
    name = name.substring(name.search("]") + 2, name.length);
  }
  return name;
}

/**
 * The SequenceParser translates the sequence JSON into linear event sequences that can easily be displayed with a plotting framework.
 * It creates an Object per sequencer (multiple DIOs are controlled by a single sequencer) that can be further processed by the plotting framework.
 */
class SequenceParser {
  #main;
  #sequenceBlockData;
  #mainSequenceBlockData;
  #sequenceConfig;
  #plotData;
  #isUpToDate;
  #inputGateCounter;
  RF_PROPERTIES = [
    "freq",
    "phase",
    "amp",
    "slope_time",
    "slope_start_delay",
    "slope_end_delay",
  ];
  DIO_PROPERTIES = [
    "output_state",
    "output_mask",
    "input_gate_state",
    "input_gate_mask",
  ];
  READOUT_PROPERTIES = ["pmt_channel", "offset_time"];
  constructor(ionpulseSequence, externalConfig) {
    if (Object.hasOwn(ionpulseSequence, "header")) {
      const sequenceDescriptionVersion =
        ionpulseSequence["header"]["version"].split(".");
      const minimumVersion = [2, 0, 4];
      for (let i = 0; i < minimumVersion.length; i++) {
        console.assert(
          sequenceDescriptionVersion[i] >= minimumVersion[i],
          "Sequence description " +
            sequenceDescriptionVersion +
            " is below minimum version " +
            minimumVersion,
        );
      }
      const maximumMajorVersion = 2;
      console.assert(
        sequenceDescriptionVersion[0] <= maximumMajorVersion,
        "Sequence description " +
          sequenceDescriptionVersion +
          " exceeds major version " +
          maximumMajorVersion,
      );
    }

    this.#main = ionpulseSequence;
    this.hasNames =
      this.#main["sequence"].length > 0 &&
      Object.hasOwn(this.#main["sequence"][0], "name");
    if (this.hasNames) {
      this.nameToId = this.#main["sequence"].reduce((cfg, val, i) => {
        cfg[val["name"]] = i;
        return cfg;
      }, {});
    }
    this.#sequenceConfig = [];
    this.#sequenceBlockData = this.#main["sequence"].map((entry, i) => {
      let settings = {};
      const name = this.hasNames ? stripIdxFromName(entry["name"]) : i;
      settings["name"] = name;

      if (Object.hasOwn(externalConfig, name)) {
        this.#sequenceConfig.push({
          display: externalConfig[name]["display"] || "full",
          paths: (externalConfig[name]["paths"] || []).slice(),
        });
      } else {
        this.#sequenceConfig.push({
          display: "full",
          paths: [],
        });
      }

      settings["calls"] = [];
      settings["callIndex"] = 0;
      settings["ch_mask"] = new Set(
        entry["ch_mask"].map((idx) =>
          getChannelKey(this.#main["header"]["channel_idx_to_hw"][idx]),
        ),
      );
      settings["type"] = entry["type"];
      settings["iterations"] = entry["iterations"];
      settings["display"] = this.#sequenceConfig[i]["display"];
      return settings;
    });
    this.#mainSequenceBlockData = this.#sequenceBlockData.at(-1);
    this.#mainSequenceBlockData["maxDepth"] = 0;
    this.#isUpToDate = false;
    this.#inputGateCounter = [...Array(N_INPUT_GATE_CHANNELS)].map(() => 1);
  }

  generatePlotData() {
    let ch_mask = new Set(this.#main["sequence"].at(-1)["ch_mask"]);
    // ch_mask.delete(0);

    let plotData = {};
    for (let ch of ch_mask) {
      const hw = this.#main["header"]["channel_idx_to_hw"][ch];
      // Initialise per-channel data. Will end up in plotData[channelKey] later
      let data = {
        time: [0],
        names: [["start"], []],
        // Array of times that alternatingly mark start and end of a time domain for
        // plotting.
        // does not necessarily have to be per channel
        // If the whole sequence is plotted it will have 2 entries in the end, [0, sequenceLength]
        timeDomain: [0],
      };
      if (
        hw["hardware"] == ChannelType.quench ||
        hw["hardware"] == ChannelType.dds
      ) {
        for (const key of this.RF_PROPERTIES) {
          data[key] = [0];
        }
      } else if (hw["hardware"] == ChannelType.dio) {
        for (const key of this.DIO_PROPERTIES) {
          data[key] = [0];
        }
      } else if (hw["hardware"] == ChannelType.readout) {
        for (const key of this.READOUT_PROPERTIES) {
          data[key] = [0];
        }
      }
      plotData[ch] = data;
    }
    for (const settings of this.#sequenceBlockData) {
      settings["callIndex"] = 0;
    }

    let loopIteration = 0;
    plotData = this.getDataForChannel(
      this.#main["sequence"].length - 1,
      ch_mask,
      plotData,
      loopIteration,
      0,
      true,
    );
    for (let value of Object.values(plotData)) {
      if (value["timeDomain"].length % 2 == 1) {
        value["timeDomain"].pop();
      }
      value["names"].pop();
    }

    this.#main["header"]["channel_idx_to_hw"].forEach((hw, ch) => {
      if (hw["hardware"] === ChannelType.dio) {
        let inputGateTimes = [...Array(N_INPUT_GATE_CHANNELS)].map(() => [0]);
        let lastGate = 0;
        plotData[ch]["time"].forEach((time, idx) => {
          let newGate =
            (lastGate & ~plotData[ch]["input_gate_mask"][idx]) |
            plotData[ch]["input_gate_state"][idx];
          let closingGate = ~newGate & lastGate;
          for (let i = 0; i < N_INPUT_GATE_CHANNELS; i++) {
            if (closingGate & (1 << i)) {
              inputGateTimes[i].push(time);
            }
          }
          lastGate = newGate;
        });
        this.#main["header"]["channel_idx_to_hw"].forEach((hw, ch) => {
          if (hw["hardware"] === ChannelType.readout) {
            plotData[ch]["time"] = plotData[ch]["time"].map(
              (gate_idx, idx) =>
                inputGateTimes[plotData[ch]["pmt_channel"][idx]][gate_idx] +
                plotData[ch]["offset_time"][idx],
            );
          }
        });
      }
    });
    // console.log("sequence block data: ", this.#sequenceBlockData);
    // console.log("plot data: ", plotData);
    return plotData;
  }

  /**
   * Get the first channel index that is not a readout channel
   * @param {Set} channelMask Set of channel indices
   * @return {int} Index of the first channel that is not a readout channel
   */
  getFirstChannel(channelMask) {
    let channelMaskIter = channelMask.values();
    let ch = channelMaskIter.next().value;
    while (
      this.#main["header"]["channel_idx_to_hw"][ch]["hardware"] ===
      ChannelType.readout
    ) {
      ch = channelMaskIter.next().value;
    }
    return ch;
  }

  /**
   * get the linearized event sequence for sequence with index `idx`
   *
   * @param {int}    idx           Index of the sequence to be processed
   * @param {Set}    channelMask   Set of channel indices
   * @param {Object} data          Current plot data (linear events per hw channel)
   * @param {int}    loopIteration Index of the current loop iteration
   * @param {int}    depth         Call depth
   * @param {bool}   recordEvents  Whether events shall be added to `data` or not
   * @return {Object} Updated plot data
   */
  getDataForChannel(
    idx,
    channelMask,
    data,
    loopIteration,
    depth,
    recordEvents,
  ) {
    const seq = this.#main["sequence"][idx];
    let isLoopSeq = false;
    let isConditionalSeq = false;
    switch (seq["type"]) {
      case "LinearSequence":
        break;
      case "ConditionalSequence":
        isConditionalSeq = true;
        break;
      case "LoopSequence":
        isLoopSeq = true;
        break;
      default:
        console.error("Unknown sequence type: " + seq["type"]);
        break;
    }
    channelMask = channelMask.intersection(new Set(seq["ch_mask"]));
    if (channelMask.size == 0) {
      return data;
    }

    if (!this.#sequenceBlockData[idx]["refChannel"]) {
      this.#sequenceBlockData[idx]["refChannel"] =
        this.getFirstChannel(channelMask);
    }
    let seqArray;
    if (isConditionalSeq) {
      if (
        this.#sequenceConfig[idx]["paths"].length <=
        this.#sequenceBlockData[idx]["callIndex"]
      ) {
        this.#sequenceConfig[idx]["paths"].push(0);
      }
      const pathIdx =
        this.#sequenceConfig[idx]["paths"][
          this.#sequenceBlockData[idx]["callIndex"]
        ];
      const numPaths = seq["sequences"].length;
      seqArray = [seq["sequences"][pathIdx % numPaths]];
    } else {
      seqArray = seq["sequences"];
    }
    let baseName = "";
    if (this.hasNames) {
      if (this.#sequenceBlockData[idx]["name"] !== "main") {
        baseName = this.#sequenceBlockData[idx]["name"];
      }
    } else {
      if (idx < this.#main["sequence"].length - 1) {
        baseName = baseName + idx;
      }
    }
    let iterations = isLoopSeq // && this.#sequenceConfig[idx]["display"] === "full"
      ? seq["iterations"]
      : 1;
    if (isLoopSeq) loopIteration *= iterations;

    const storeTime = (key, iterationName) => {
      if (key === "startTime") {
        this.#sequenceBlockData[idx]["calls"].push({
          startTime:
            data[this.getFirstChannel(channelMask)]["timeDomain"].at(-1),
          depth: depth,
          name: iterationName,
          data: {},
        });
        if (depth > this.#mainSequenceBlockData["maxDepth"]) {
          this.#mainSequenceBlockData["maxDepth"] = depth;
        }
      } else {
        this.#sequenceBlockData[idx]["calls"].at(-1)[key] =
          data[this.getFirstChannel(channelMask)]["timeDomain"].at(-1);
      }
      for (let ch of channelMask) {
        if (
          this.#main["header"]["channel_idx_to_hw"][ch]["hardware"] ===
          ChannelType.readout
        )
          continue;
        console.assert(
          this.#sequenceBlockData[idx]["calls"].some((call) => {
            return (
              Math.abs(call[key] - data[ch]["timeDomain"].at(-1)) <=
              1e6 * Number.EPSILON
            );
          }),
          key +
            " on channel " +
            ch +
            " don't match for Sequence " +
            idx +
            ". " +
            data[ch]["timeDomain"].at(-1) +
            " is not in " +
            this.#sequenceBlockData[idx]["calls"].map((v) => v[key]),
        );
        // if (
        //   !this.#sequenceBlockData[idx]["calls"].some((call) => {
        //     return (
        //       Math.abs(call[key] - data[ch]["timeDomain"].at(-1)) <=
        //       1e6 * Number.EPSILON
        //     );
        //   })
        // ) {
        //   console.log(data[ch]["time"], data[ch]["timeDomain"]);
        //   console.log(this.#sequenceBlockData[idx]);
        // }
      }
    };

    const lastDataLength = Object.keys(data).reduce((prev, ch) => {
      prev[ch] = data[ch].time.length;
      return prev;
    }, {});
    for (let i = 0; i < iterations; i++) {
      const callIndex = this.#sequenceBlockData[idx]["callIndex"];
      let iterationName = baseName;
      if (isLoopSeq) iterationName += "[" + i + "]";
      if (isConditionalSeq)
        iterationName +=
          "{" + this.#sequenceConfig[idx]["paths"][callIndex] + "}";
      if (iterationName.length > 0)
        for (let ch of channelMask) {
          data[ch]["names"].at(-1).push(iterationName);
        }
      storeTime("startTime", iterationName);
      const recordEventsLocal =
        recordEvents && this.#sequenceConfig[idx]["display"] !== "hide";

      for (let ch of channelMask) {
        if (data[ch]["timeDomain"].length % 2 == recordEventsLocal) {
          // If it's even and not record or if it's odd and record
          data[ch]["timeDomain"].push(data[ch]["timeDomain"].at(-1));
        }
      }

      // Optionally gets replaced with another Object
      // that stores the temporary data that gets discarded
      // when the sequence is minimized or contracted
      let dataLocal = data;
      if (
        (this.#sequenceConfig[idx]["display"] == "minimized" ||
          this.#sequenceConfig[idx]["display"] == "contracted") &&
        (i > 0 || callIndex > 0)
      ) {
        console.assert(
          callIndex < this.#sequenceBlockData[idx]["calls"].length,
          `callIndex ${callIndex} too large for calls array with length ${this.#sequenceBlockData[idx]["calls"].length}`,
        );
        dataLocal = Object.entries(data).reduce(
          (lastData, [channel, channelData]) => {
            lastData[channel] = Object.keys(channelData).reduce(
              (lastChannelData, dataType) => {
                if (dataType === "timeDomain") {
                  lastChannelData[dataType] = channelData[dataType].slice(-1);
                } else {
                  lastChannelData[dataType] = channelData[dataType].slice(
                    lastDataLength[channel] - 1,
                    lastDataLength[channel],
                  );
                }
                return lastChannelData;
              },
              {},
            );
            // Update the time of the carrier over events to the time of the current call
            // as indicated by timeDomain
            lastData[channel]["time"] = lastData[channel]["time"].map((t) => {
              return (
                t -
                lastData[channel]["time"][0] +
                lastData[channel]["timeDomain"][0]
              );
            });
            return lastData;
          },
          {},
        );
        this.#sequenceBlockData[idx]["calls"][callIndex]["data"] = dataLocal;
      }

      for (let event of seqArray) {
        if (typeof event === "object") {
          event = event[0];
        }
        if (event < this.#main["event"].length) {
          dataLocal = this.getEventDataForChannel(
            event,
            channelMask,
            dataLocal,
            loopIteration + i,
            recordEventsLocal,
          );
        } else {
          dataLocal = this.getDataForChannel(
            event - this.#main["event"].length,
            channelMask,
            dataLocal,
            loopIteration + i,
            depth + 1,
            recordEventsLocal,
          );
        }
      }
      // equivalent to this.#sequenceConfig[idx]["display"] === "minimized"
      if (
        dataLocal !== data &&
        this.#sequenceConfig[idx]["display"] !== "contracted"
      ) {
        for (const ch in data) {
          data[ch]["timeDomain"][data[ch]["timeDomain"].length - 1] =
            dataLocal[ch]["timeDomain"].at(-1);
        }
      }
      Object.values(data).forEach((channelData) => {
        if (iterationName.length > 0) channelData["names"].at(-1).pop();
      });
      storeTime("endTime");
      this.#sequenceBlockData[idx]["callIndex"]++;
    }
    return data;
  }

  getParamValue(type, value, channelMask, data, loopIteration, recordEvents) {
    if (typeof value === "object") {
      // value is a list of index and name
      value = value[0];
    }
    const mainType = type.endsWith("time") ? "time" : type;

    if (Object.hasOwn(this.#main, mainType)) {
      // value points to a parameter
      if (value < this.#main[mainType].length) {
        value = this.#main[mainType][value].value;
        if (typeof value === "object") {
          value = value[loopIteration % value.length];
        }
      } else {
        if (Object.hasOwn(this.#main, mainType + "_spline_parameter")) {
          value =
            this.#main[mainType + "_spline_parameter"][
              value - this.#main[mainType].length
            ];
        }
      }
    }

    let scaling = 1;
    if (type.endsWith("time")) {
      scaling = 1 / 1000;
    } else if (type === "amp") {
      scaling = 100 / (Math.pow(2, 14) - 1);
    } else if (type === "phase") {
      scaling = 360 / Math.pow(2, 16);
    } else if (type === "freq") {
      scaling = 1e3 / Math.pow(2, 32);
    }
    if (type === "time") {
      for (const ch of channelMask) {
        data[ch]["timeDomain"][data[ch]["timeDomain"].length - 1] +=
          value * scaling;
      }
    }
    if (recordEvents) {
      if (type === "time") {
        for (const ch of channelMask) {
          data[ch][type].push(data[ch]["timeDomain"].at(-1));
        }
      } else {
        if (typeof value === "object") {
          // Is PPoly
          for (const ch of channelMask) {
            data[ch][type].push({
              segment_length: value["segment_length"],
            });
            for (let o = 0; o <= 3; o++) {
              data[ch][type].at(-1)["x" + o] = value["x" + o]
                ? value["x" + o].map((x) => x * scaling)
                : null;
            }
          }
        } else {
          for (const ch of channelMask) {
            data[ch][type].push(value * scaling);
          }
        }
      }
    }

    return data;
  }

  getEventDataForChannel(idx, channelMask, data, loopIteration, recordEvents) {
    let event = this.#main["event"][idx];
    channelMask = channelMask.intersection(new Set(event["ch_mask"]));
    console.assert(
      channelMask,
      "Enclosing sequence does not contain channel " + event["ch_mask"],
    );

    for (const ch of channelMask) {
      data[ch]["names"].push([...data[ch]["names"].at(-1)]);
      if (this.hasNames) {
        data[ch]["names"].at(-2).push(stripIdxFromName(event["name"]));
      } else {
        data[ch]["names"].at(-2).push("Event " + idx);
      }
    }

    let events = [event];
    let nameSuffix = [""];
    switch (event["type"]) {
      case "SingleToneRFEvent":
        if (event["slope_time"] !== null) {
          events = [{ ...event }, { ...event }, { ...event }, { ...event }];
          events[0]["slope_time"] = null;
          events[1]["time"] = event["slope_start_delay"];
          nameSuffix.push(" slope start delay");
          events[2]["slope_time"] = null;
          events[2]["time"] = event["slope_time"];
          nameSuffix.push(" slope");
          events[3]["slope_time"] = null;
          events[3]["time"] = event["slope_end_delay"];
          nameSuffix.push(" slope end delay");
        }
        for (let i = 0; i < events.length; i++) {
          for (let type of this.RF_PROPERTIES.concat(["time"])) {
            if (type in events[i] && events[i][type] !== null) {
              data = this.getParamValue(
                type,
                events[i][type],
                channelMask,
                data,
                loopIteration,
                recordEvents,
              );
            } else if (recordEvents) {
              for (const ch of channelMask) {
                data[ch][type].push(0);
              }
            }
          }
          if (i !== events.length - 1) {
            for (const ch of channelMask) {
              data[ch]["names"].push([...data[ch]["names"].at(-1)]);
              if (this.hasNames) {
                data[ch]["names"]
                  .at(-2)
                  .push(stripIdxFromName(event["name"]) + nameSuffix[i]);
              } else {
                data[ch]["names"].at(-2).push("Event " + idx + nameSuffix[i]);
              }
            }
          }
        }
        break;
      case "MultiToneRFEvent":
        // TODO Properly implement
        for (let type of this.RF_PROPERTIES.concat(["time"])) {
          if (type in event && event[type] !== null) {
            data = this.getParamValue(
              type,
              event[type],
              channelMask,
              data,
              loopIteration,
              recordEvents,
            );
          } else if (recordEvents) {
            for (const ch of channelMask) {
              data[ch][type].push(0);
            }
          }
        }
        break;
      case "DDSPIDStateChange":
      case "Wait":
        data = this.getParamValue(
          "time",
          event["time"],
          channelMask,
          data,
          loopIteration,
          recordEvents,
        );
        if (recordEvents) {
          for (let type of this.RF_PROPERTIES.concat(this.DIO_PROPERTIES)) {
            for (const ch of channelMask) {
              if (type in data[ch]) {
                if (type === "slope_time" && data[ch]["amp"].at(-1) !== 0) {
                  // if (type === "slope_time") {
                  data[ch][type].push(0);
                } else {
                  // TODO handle accumulator settings properly
                  if (typeof data[ch][type].at(-1) === "object") {
                    data[ch][type].push(data[ch][type].at(-1).x0.at(-1));
                  } else {
                    data[ch][type].push(data[ch][type].at(-1));
                  }
                }
              }
            }
          }
        }
        break;
      case "DIOEvent":
        for (let type of this.DIO_PROPERTIES.concat(["time"])) {
          data = this.getParamValue(
            type,
            event[type],
            channelMask,
            data,
            loopIteration,
            recordEvents,
          );
        }
        break;
      case "Discriminator":
        for (let ch of event["ch_mask"]) {
          console.assert(
            this.#main["header"]["channel_idx_to_hw"][ch]["hardware"] ==
              ChannelType.readout,
            "Found Discriminator event with hardware channel not equal to 'Readout'",
          );
          data[ch]["time"].push(data[ch]["time"].at(-1));
          data[ch]["pmt_channel"].push(data[ch]["pmt_channel"].at(-1));
          // Increment offset time as multiple discriminators might follow
          // a poppmtfifo event
          data[ch]["offset_time"].push(data[ch]["offset_time"].at(-1) + 0.5);
          data[ch]["names"].at(-2).push("Discriminator");
        }
        // TODO Properly implement
        break;
      case "PopPMTFIFO":
        for (let ch of event["ch_mask"]) {
          console.assert(
            this.#main["header"]["channel_idx_to_hw"][ch]["hardware"] ==
              ChannelType.readout,
            "Found PopPMTFIFO event with hardware channel not equal to 'Readout'",
          );
          data[ch]["time"].push(this.#inputGateCounter[event["pmt_channel"]]++);
          data[ch]["pmt_channel"].push(event["pmt_channel"]);
          data[ch]["offset_time"].push(0);
          data[ch]["names"].at(-2).push("PopPMTFIFO");
        }
        break;
      default:
        console.error("Encountered unexpected event: " + event["type"]);
        break;
    }
    return data;
  }

  get plotData() {
    if (!this.#isUpToDate) {
      this.#plotData = Object.entries(this.generatePlotData()).reduce(
        (plotData, [ch, channelData]) => {
          plotData[this.chIdxToKey(ch)] = channelData;
          return plotData;
        },
        {},
      );
      this.#sequenceBlockData.forEach((seq) => {
        seq["calls"].forEach((call) => {
          call["data"] = Object.entries(call["data"]).reduce(
            (callData, [ch, channelData]) => {
              callData[this.chIdxToKey(ch)] = channelData;
              return callData;
            },
            {},
          );
        });
      });
      this.#isUpToDate = true;
    }
    return this.#plotData;
  }

  get sequenceBlockData() {
    return this.#sequenceBlockData;
  }

  /**
   * chIdxToKey converts hardware channel idx to a unique string
   */
  chIdxToKey(idx) {
    const hw = this.#main["header"]["channel_idx_to_hw"][idx];
    return getChannelKey(hw);
  }
}

function blackman(t) {
  const phase = t * Math.PI;
  return (
    0.355768 -
    0.487396 * Math.cos(phase) +
    0.144232 * Math.cos(2 * phase) -
    0.012604 * Math.cos(3 * phase)
  );
}

const freqScaling = 0.002;

const clockRate = 250;
const samplingRate = 25;
const lengthBits = 16;
function accumulate(ppoly, tArray, order = 3) {
  let pieceIdx = 0;
  let accumulator = Array.from(Array(order + 1).keys()).map(
    (i) => ppoly["x" + i][pieceIdx],
  );
  let tickUntilPiece = 0;
  let piecewiseTick = 0;
  return tArray.map((t) => {
    while (piecewiseTick + tickUntilPiece < (t - tArray[0]) * clockRate) {
      if (ppoly.segment_length[pieceIdx] === 0) {
        // End of accumulation sequence
        break;
      }
      if (piecewiseTick == ppoly.segment_length[pieceIdx]) {
        pieceIdx++;
        if (pieceIdx < ppoly.segment_length.length) {
          accumulator = Array.from(Array(order + 1).keys()).map(
            (i) => ppoly["x" + i][pieceIdx],
          );
          tickUntilPiece += piecewiseTick;
          piecewiseTick = 0;
        } else {
          console.error(
            "Reached unexpected end of accumulation sequence.\n" +
              "Expected to end with 0 length segment",
          );
          break;
        }
      }
      for (let o = 0; o < order; o++) {
        accumulator[o] += accumulator[o + 1] / 2 ** lengthBits;
      }
      piecewiseTick++;
    }
    return accumulator[0];
  });
}

function expandToWaveform(sequenceDataChannel, targets = ["sample"]) {
  targets.forEach((target) => {
    if (!["freq", "phase", "amp", "sample"].includes(target))
      console.error("Unexpected waveform expansion target: " + key);
  });
  // time is in units of us so sampling rate of 10 equal 10 MSPS
  let nSamples = 0;
  for (let i = 0; i < sequenceDataChannel["time"].length - 1; i++) {
    let a = sequenceDataChannel["amp"][i];
    if (a === 0) {
      nSamples += 2;
    } else {
      const segmentSamples = Math.ceil(
        (sequenceDataChannel["time"][i + 1] - sequenceDataChannel["time"][i]) *
          samplingRate,
      );
      nSamples += segmentSamples;
    }
  }

  const time = new Array(nSamples).fill(0);
  const value = targets.reduce((last, key) => {
    last[key] = new Array(nSamples).fill(0);
    return last;
  }, {});
  let currentIdx = 0;
  for (let i = 0; i < sequenceDataChannel["time"].length - 1; i++) {
    const duration =
      sequenceDataChannel["time"][i + 1] - sequenceDataChannel["time"][i];
    // Unfold waveforms
    let f = sequenceDataChannel["freq"][i];
    let p = sequenceDataChannel["phase"][i];
    let a = sequenceDataChannel["amp"][i];
    let t = sequenceDataChannel["time"][i];
    let slopeTime = sequenceDataChannel["slope_time"][i];

    const isOffEvent = a === 0 || (Object.hasOwn(a, "x0") && a.x0.at(-1) === 0);
    if (slopeTime > 0 && isOffEvent) {
      f = sequenceDataChannel["freq"][i - 1];
      p = sequenceDataChannel["phase"][i - 1];
      a = sequenceDataChannel["amp"][i - 1];
    }

    // Create an array of times uniformly spaced by
    // 1 / samplingRate in the intervall [t0, t0+duration]
    // (note the including limits up and down to create steep edges
    // in the line plot later)
    let getTimeArray = (t0, duration) => {
      const nSamples = Math.ceil(duration * samplingRate);
      return Array.from(
        { length: nSamples },
        (_, idx) => t0 + idx * (duration / (nSamples - 1)),
      );
    };

    const times = getTimeArray(t, duration);
    // console.log(`Expanding ${times.length} samples from ${t.toFixed(3)} to ${(t + duration).toFixed(3)}, f: ${f.toFixed(2)}, a: ${a.toFixed(2)}, p: ${p.toFixed(2)}`);
    // Optionally use relative time

    const paramKeys = ["freq", "phase", "amp"];
    let paramArrays = {};
    const storeSample = targets.includes("sample");
    const accumulatorOrder = {
      freq: 1,
      phase: 0,
      amp: 3,
    };

    const paramObj = {
      freq: f,
      phase: p,
      amp: a,
    };

    for (let key of paramKeys) {
      const storeKey = targets.includes(key);
      if (storeKey || storeSample) {
        if (typeof paramObj[key] === "object") {
          paramArrays[key] = accumulate(
            paramObj[key],
            times,
            accumulatorOrder[key],
          );
        } else {
          if (key === "amp" && slopeTime > 0) {
            paramArrays[key] = times.map((timeVal) => {
              return (
                (timeVal < slopeTime + t
                  ? isOffEvent
                    ? blackman((t + slopeTime - timeVal) / slopeTime)
                    : blackman((timeVal - t) / slopeTime)
                  : isOffEvent
                    ? 0
                    : 1) * a
              );
            });
          } else {
            paramArrays[key] = [paramObj[key]];
          }
        }
        if (storeKey)
          times.forEach(
            (_, idx) =>
              (value[key][currentIdx + idx] =
                paramArrays[key][idx % paramArrays[key].length]),
          );
      }
    }

    if (storeSample) {
      if (paramArrays["freq"].length > 1) {
        let cumSumPhase = 0;
        const dt = times[1] - times[0];
        times.forEach((_, idx) => {
          value["sample"][currentIdx + idx] =
            paramArrays["amp"][idx % paramsArrays["amp"].length] *
            Math.cos(
              2 *
                Math.PI *
                (cumSumPhase +
                  paramArrays["phase"][idx % paramArrays["phase"].length] /
                    360),
            );
          cumSumPhase += paramsArrays["freq"][idx] * freqScaling * dt;
        });
      } else {
        times.forEach((timeVal, idx) => {
          value["sample"][currentIdx + idx] =
            paramArrays["amp"][idx % paramsArrays["amp"].length] *
            Math.cos(
              2 *
                Math.PI *
                (f * freqScaling * timeVal +
                  paramArrays["phase"][idx % paramArrays["phase"].length] /
                    360),
            );
        });
      }
    }
    times.forEach((timeVal, idx) => {
      time[currentIdx + idx] = timeVal;
    });
    currentIdx += times.length;
  }

  return [time, value];
}

export { SequenceParser, expandToWaveform, ChannelType };
