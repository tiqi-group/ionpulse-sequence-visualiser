const ChannelType = {
  quench: "QuenchHardware",
  dds: "DDSHardware",
  dio: "DIOHardware",
  readout: "Readout",
  qubit: "Qubit",
};

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
  RF_PROPERTIES = ["freq", "phase", "amp", "slope_time"];
  DIO_PROPERTIES = ["output", "output_mask", "pmts", "pmts_mask"];
  constructor(ionpulseSequence, externalConfig) {
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
  }

  generatePlotData() {
    let ch_mask = new Set(this.#main["sequence"].at(-1)["ch_mask"]);
    ch_mask.delete(0);

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
    // console.log("sequence block data: ", this.#sequenceBlockData);
    // console.log("plot data: ", plotData);
    return plotData;
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
    let isFork = seq["type"] === "Fork";
    channelMask = channelMask.intersection(new Set(seq["ch_mask"]));
    if (channelMask.size == 0) {
      return data;
    }

    if (!this.#sequenceBlockData[idx]["refChannel"]) {
      this.#sequenceBlockData[idx]["refChannel"] = channelMask
        .values()
        .next().value;
    }
    let seqArray;
    if (isFork) {
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
    let isLoop = seq["type"] === "Loop";
    let iterations = isLoop // && this.#sequenceConfig[idx]["display"] === "full"
      ? seq["iterations"]
      : 1;
    if (isLoop) loopIteration *= iterations;

    const storeTime = (key, iterationName) => {
      if (key === "startTime") {
        this.#sequenceBlockData[idx]["calls"].push({
          startTime:
            data[channelMask.values().next().value]["timeDomain"].at(-1),
          depth: depth,
          name: iterationName,
          data: {},
        });
        if (depth > this.#mainSequenceBlockData["maxDepth"]) {
          this.#mainSequenceBlockData["maxDepth"] = depth;
        }
      } else {
        this.#sequenceBlockData[idx]["calls"].at(-1)[key] =
          data[channelMask.values().next().value]["timeDomain"].at(-1);
      }
      for (let ch of channelMask) {
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
        if (
          !this.#sequenceBlockData[idx]["calls"].some((call) => {
            return (
              Math.abs(call[key] - data[ch]["timeDomain"].at(-1)) <=
              1e6 * Number.EPSILON
            );
          })
        ) {
          console.log(data[ch]);
          console.log(this.#sequenceBlockData[idx]);
        }
      }
    };

    const lastDataLength = data[channelMask.values().next().value].time.length;
    for (let i = 0; i < iterations; i++) {
      const callIndex = this.#sequenceBlockData[idx]["callIndex"];
      let iterationName = baseName;
      if (isLoop) iterationName += "[" + i + "]";
      if (isFork)
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
                    lastDataLength - 1,
                    lastDataLength,
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
    const mainType = type === "slope_time" ? "time" : type;

    if (Object.hasOwn(this.#main, mainType)) {
      // value points to a parameter
      value = this.#main[mainType][value].value;
    }

    if (typeof value === "object") {
      value = value[loopIteration % value.length];
    }
    let scaling = 1;
    if (type === "time" || type === "slope_time") {
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
        for (const ch of channelMask) {
          data[ch][type].push(value * scaling);
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

    switch (event["type"]) {
      case "DDSEvent":
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
                  data[ch][type].push(data[ch][type].at(-1));
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

function expandToWaveform(sequenceData) {
  // time is in units of us so sampling rate of 10 equal 10 MSPS
  const samplingRate = 10;
  let nSamples = 0;
  for (let i = 0; i < sequenceData["time"].length - 1; i++) {
    let a = sequenceData["amp"][i];
    if (a === 0) {
      nSamples += 2;
    } else {
      const segmentSamples = Math.ceil(
        (sequenceData["time"][i + 1] - sequenceData["time"][i]) * samplingRate,
      );
      nSamples += segmentSamples;
    }
  }

  const time = new Array(nSamples).fill(0);
  const value = new Array(nSamples).fill(0);
  let currentIdx = 0;
  for (let i = 0; i < sequenceData["time"].length - 1; i++) {
    const duration = sequenceData["time"][i + 1] - sequenceData["time"][i];
    // Unfold waveforms
    const f = sequenceData["freq"][i];
    const p = sequenceData["phase"][i];
    const a = sequenceData["amp"][i];
    const t = sequenceData["time"][i];
    const slopeTime = sequenceData["slope_time"][i];

    let getTimeArray = (t0, duration) => {
      const nSamples = Math.ceil(duration * samplingRate);
      return Array.from(
        { length: nSamples },
        (_, idx) => t0 + idx * (duration / nSamples),
      );
    };

    if (a === 0) {
      // console.log(`Expanding ${0} amplitude from ${t.toFixed(3)} to ${(t + duration).toFixed(3)}`);
      if (slopeTime > 0) {
        const times = getTimeArray(0, slopeTime);
        times.forEach((timeVal, idx) => {
          time[currentIdx + idx] = timeVal + t;
          value[currentIdx + idx] =
            sequenceData["amp"][i - 1] *
            blackman(1 - timeVal / slopeTime) *
            Math.cos(
              2 *
                Math.PI *
                (sequenceData["freq"][i - 1] * freqScaling * (timeVal + t) +
                  sequenceData["phase"][i - 1] / 360),
            );
        });
        currentIdx += times.length;
      } else {
        time[currentIdx] = t;
        value[currentIdx] = 0;
        currentIdx++;
      }
      time[currentIdx] = sequenceData["time"][i + 1];
      value[currentIdx] = 0;
      currentIdx++;
    } else {
      const times = getTimeArray(t, duration);
      // console.log(`Expanding ${times.length} samples from ${t.toFixed(3)} to ${(t + duration).toFixed(3)}, f: ${f.toFixed(2)}, a: ${a.toFixed(2)}, p: ${p.toFixed(2)}`);
      // Optionally use relative time
      times.forEach((timeVal, idx) => {
        time[currentIdx + idx] = timeVal;
        value[currentIdx + idx] =
          (timeVal < slopeTime + t ? blackman((timeVal - t) / slopeTime) : 1) *
          a *
          Math.cos(2 * Math.PI * (f * freqScaling * timeVal + p / 360));
      });
      currentIdx += times.length;
    }
  }

  return [time, value];
}

export { SequenceParser, expandToWaveform, ChannelType };
