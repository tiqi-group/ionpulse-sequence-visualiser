const ChannelSequenceType = {
  rf: "rf_channel_sequences",
  dio: "digital_io",
  readout: "readout",
  qubit: "qubit_sequences",
};

const N_RF_CHANNELS = 32;
const N_TTL_CHANNELS = 32;
const N_PMT_CHANNELS = 8;

function getChannelKey(type, idx) {
  if (type === ChannelSequenceType.rf) {
    return "RF" + idx;
  } else if (type === ChannelSequenceType.dio) {
    return idx < 0 ? "PMT" + (idx + N_PMT_CHANNELS) : "TTL" + idx;
  }
}

function stripIdxFromName(name) {
  if (name === undefined) {
    return "";
  }
  if (name.startsWith("[")) {
    name = name.substring(name.search("]") + 2, name.length);
  }
  return name;
}

class SequenceParser {
  #main;
  #sequenceBlockData;
  #mainSequenceBlockData;
  #sequenceConfig;
  #plotData;
  #isUpToDate;
  RF_PROPERTIES = ["freq", "phase", "amp", "slope_time"];
  constructor(ionpulseSequence, externalConfig) {
    this.#main = ionpulseSequence;
    this.hasNames =
      this.#main["Sequence"].length > 0 &&
      Object.hasOwn(this.#main["Sequence"][0], "name");
    if (this.hasNames) {
      this.nameToId = this.#main["Sequence"].reduce((cfg, val, i) => {
        cfg[val["name"]] = i;
        return cfg;
      }, {});
    }
    this.#sequenceConfig = [];
    this.#sequenceBlockData = this.#main["Sequence"].map((entry, i) => {
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
      settings["ch_mask"] = entry["ch_mask"];
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
    let plotData = {};
    for (let rf_idx of Object.keys(
      this.#main["Sequence"].at(-1)[ChannelSequenceType.rf],
    )) {
      // Initialise per-channel data. Will end up in plotData[channelKey] later
      let data = {
        time: [0],
        names: [["start"], []],
        // Array of times that alternatingly mark start and end of a time domain for
        // plotting.
        timeDomain: [0],
      };
      for (const key of this.RF_PROPERTIES) {
        data[key] = [0];
      }
      for (const settings of this.#sequenceBlockData) {
        settings["callIndex"] = 0;
      }
      let loopIteration = 0;
      const channelKey = getChannelKey(ChannelSequenceType.rf, rf_idx);
      plotData[channelKey] = this.getDataForChannel(
        this.#main["Sequence"].length - 1,
        ChannelSequenceType.rf,
        rf_idx,
        data,
        loopIteration,
        0,
        true,
      );
      if (plotData[channelKey]["timeDomain"].length % 2 == 1) {
        plotData[channelKey]["timeDomain"].pop();
      }
      plotData[channelKey]["names"].pop();
    }
    for (let i = -N_PMT_CHANNELS; i < N_TTL_CHANNELS; i++) {
      let data = {
        values: [0],
        time: [0],
        names: [["start"], []],
        timeDomain: [0],
      };
      for (const settings of this.#sequenceBlockData) {
        settings["callIndex"] = 0;
      }
      let loopIteration = 0;
      const name = getChannelKey(ChannelSequenceType.dio, i);
      plotData[name] = this.getDataForChannel(
        this.#main["Sequence"].length - 1,
        ChannelSequenceType.dio,
        i,
        data,
        loopIteration,
        0,
        true,
      );
      if (plotData[name]["timeDomain"].length % 2 == 1) {
        plotData[name]["timeDomain"].pop();
      }
      plotData[name]["names"].pop();
    }
    return plotData;
  }

  getDataForChannel(
    idx,
    channelType,
    channelIdx,
    data,
    loopIteration,
    depth,
    recordEvents,
  ) {
    const seq = this.#main["Sequence"][idx];
    let channelSequence;
    let isFork = seq["type"] === "Fork";

    if (!this.#sequenceBlockData[idx]["refChannel"]) {
      this.#sequenceBlockData[idx]["refChannel"] = {
        channelType: channelType,
        channelIdx: channelIdx,
      };
    }
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
      if (
        channelType === ChannelSequenceType.rf ||
        channelType === ChannelSequenceType.qubit_sequences
      ) {
        const numPaths = seq[channelType][channelIdx].length;
        channelSequence = [seq[channelType][channelIdx][pathIdx % numPaths]];
      } else {
        const numPaths = seq[channelType].length;
        channelSequence = [seq[channelType][pathIdx % numPaths]];
      }
    } else {
      if (
        channelType === ChannelSequenceType.rf ||
        channelType === ChannelSequenceType.qubit_sequences
      ) {
        channelSequence = seq[channelType][channelIdx];
      } else {
        channelSequence = seq[channelType];
      }
    }
    let baseName = "";
    if (this.hasNames) {
      if (this.#sequenceBlockData[idx]["name"] !== "main") {
        baseName = this.#sequenceBlockData[idx]["name"];
      }
    } else {
      if (idx < this.#main["Sequence"].length - 1) {
        baseName = baseName + idx;
      }
    }
    let isLoop = seq["type"] === "Loop";
    let iterations = isLoop // && this.#sequenceConfig[idx]["display"] === "full"
      ? seq["iterations"]
      : 1;
    if (isLoop) loopIteration *= iterations;

    const storeTime = (key, iterationName) => {
      if (
        this.#sequenceBlockData[idx]["refChannel"]["channelType"] ===
          channelType &&
        this.#sequenceBlockData[idx]["refChannel"]["channelIdx"] === channelIdx
      ) {
        if (key === "startTime") {
          this.#sequenceBlockData[idx]["calls"].push({
            startTime: data["timeDomain"].at(-1),
            depth: depth,
            name: iterationName,
            data: {},
          });
          if (depth > this.#mainSequenceBlockData["maxDepth"]) {
            this.#mainSequenceBlockData["maxDepth"] = depth;
          }
        } else {
          this.#sequenceBlockData[idx]["calls"].at(-1)[key] =
            data["timeDomain"].at(-1);
        }
      } else {
        console.assert(
          this.#sequenceBlockData[idx]["calls"].some((call) => {
            return (
              Math.abs(call[key] - data["timeDomain"].at(-1)) <=
              1e6 * Number.EPSILON
            );
          }),
          key +
            " on channel " +
            channelIdx +
            " don't match for Sequence " +
            idx +
            ". " +
            data["timeDomain"].at(-1) +
            " is not in " +
            this.#sequenceBlockData[idx]["calls"].map((v) => v[key]),
        );
        if (
          !this.#sequenceBlockData[idx]["calls"].some((call) => {
            return (
              Math.abs(call[key] - data["timeDomain"].at(-1)) <=
              1e6 * Number.EPSILON
            );
          })
        ) {
          console.log(data);
          console.log(this.#sequenceBlockData[idx]);
        }
      }
    };

    const lastDataLength = data.time.length;
    for (let i = 0; i < iterations; i++) {
      const callIndex = this.#sequenceBlockData[idx]["callIndex"];
      let iterationName = baseName;
      if (isLoop) iterationName += "[" + i + "]";
      if (isFork)
        iterationName +=
          "{" + this.#sequenceConfig[idx]["paths"][callIndex] + "}";
      if (iterationName.length > 0) data["names"].at(-1).push(iterationName);
      storeTime("startTime", iterationName);
      const recordEventsLocal =
        recordEvents && this.#sequenceConfig[idx]["display"] !== "hide";
      if (data["timeDomain"].length % 2 == recordEventsLocal) {
        // If it's even and not record or if it's odd and record
        data["timeDomain"].push(data["timeDomain"].at(-1));
      }

      let dataLocal = data;
      const channelKey = getChannelKey(channelType, channelIdx);
      if (
        this.#sequenceConfig[idx]["display"] == "minimized" &&
        (i > 0 || callIndex > 0)
      ) {
        console.assert(
          callIndex < this.#sequenceBlockData[idx]["calls"].length,
          `callIndex ${callIndex} too large for calls array with length ${this.#sequenceBlockData[idx]["calls"].length}`,
        );
        this.#sequenceBlockData[idx]["calls"][callIndex]["data"][channelKey] =
          Object.keys(data).reduce((lastData, dataKey) => {
            // if (dataKey === "names") {
            // Do we need extra treatment? last 2 entries?
            if (dataKey === "timeDomain") {
              lastData[dataKey] = data[dataKey].slice(-1);
            } else {
              lastData[dataKey] = data[dataKey].slice(
                lastDataLength - 1,
                lastDataLength,
              );
            }
            return lastData;
          }, {});
        dataLocal =
          this.#sequenceBlockData[idx]["calls"][callIndex]["data"][channelKey];
      }

      for (let event of channelSequence) {
        if (typeof event === "object") {
          event = event[0];
        }
        if (event < this.#main["Event"].length) {
          dataLocal = this.getEventDataForChannel(
            event,
            channelType,
            channelIdx,
            dataLocal,
            loopIteration + i,
            recordEventsLocal,
          );
        } else {
          dataLocal = this.getDataForChannel(
            event - this.#main["Event"].length,
            channelType,
            channelIdx,
            dataLocal,
            loopIteration + i,
            depth + 1,
            recordEventsLocal,
          );
        }
      }
      if (dataLocal !== data) {
        data["timeDomain"][data["timeDomain"].length - 1] =
          dataLocal["timeDomain"].at(-1);
      }
      if (iterationName.length > 0) data["names"].at(-1).pop();
      storeTime("endTime");
      this.#sequenceBlockData[idx]["callIndex"]++;
    }
    return data;
  }

  getParamValue(
    type,
    idx,
    channelType,
    channelIdx,
    data,
    loopIteration,
    recordEvents,
  ) {
    if (typeof idx === "object") {
      idx = idx[0];
    }
    const mainType =
      type === "slope_time"
        ? "Time"
        : type.substring(0, 1).toUpperCase() + type.substring(1, type.length);
    const param = this.#main[mainType][idx];
    console.assert(
      channelType === ChannelSequenceType.rf
        ? param["ch_mask"]["rf"] & (1 << channelIdx)
        : channelType === ChannelSequenceType.dio
          ? param["ch_mask"]["digital_io"]
          : false,
      "Param ended up in the wrong Event",
    );

    let value = param.value;
    if (typeof value === "object") {
      value = value[loopIteration % param.value.length];
    }
    if (type === "time") {
      data["timeDomain"][data["timeDomain"].length - 1] += value;
    }
    if (recordEvents) {
      if (type === "time") {
        data[type].push(data["timeDomain"].at(-1));
      } else {
        data[type].push(value);
      }
    }

    return data;
  }

  getEventDataForChannel(
    idx,
    channelType,
    channelIdx,
    data,
    loopIteration,
    recordEvents,
  ) {
    let event = this.#main["Event"][idx];
    console.assert(
      channelType === ChannelSequenceType.rf
        ? event["ch_mask"]["rf"] & (1 << channelIdx)
        : channelType === ChannelSequenceType.dio
          ? event["ch_mask"]["digital_io"]
          : false,
      "Event ended up in the wrong ChannelSequence",
    );

    data["names"].push([...data["names"].at(-1)]);
    if (this.hasNames) {
      data["names"].at(-2).push(stripIdxFromName(event["name"]));
    } else {
      data["names"].at(-2).push("Event " + idx);
    }

    switch (event["type"]) {
      case "RFEdge":
        for (let type of this.RF_PROPERTIES.concat(["time"])) {
          if (type in event) {
            data = this.getParamValue(
              type,
              event[type],
              channelType,
              channelIdx,
              data,
              loopIteration,
              recordEvents,
            );
          } else if (recordEvents) {
            data[type].push(0);
          }
        }
        break;
      case "RFWait":
        data = this.getParamValue(
          "time",
          event["time"],
          channelType,
          channelIdx,
          data,
          loopIteration,
          recordEvents,
        );
        if (recordEvents) {
          for (let type of this.RF_PROPERTIES) {
            data[type].push(data[type].at(-1));
          }
        }
        break;
      case "TtlEdge":
        data = this.getParamValue(
          "time",
          event["time"],
          channelType,
          channelIdx,
          data,
          loopIteration,
          recordEvents,
        );
        if (recordEvents) {
          if (channelIdx < 0) {
            channelIdx += 8;
            let mask = 1 << channelIdx;
            data["values"].push(
              (data["values"][-1] &
                ((event["pmts_to_change"] & mask) === 0 ? 0 : 1)) |
                ((event["pmts"] & mask) === 0 ? 0 : 1),
            );
          } else {
            let mask = 1 << channelIdx;
            data["values"].push(
              (data["values"][-1] &
                ((event["ttls_to_change"] & mask) === 0 ? 0 : 1)) |
                ((event["ttl_target"] & mask) === 0 ? 0 : 1),
            );
          }
        }
        break;
    }
    return data;
  }

  get plotData() {
    if (!this.#isUpToDate) {
      this.#plotData = this.generatePlotData();
      this.#isUpToDate = true;
    }
    return this.#plotData;
  }

  get sequenceBlockData() {
    return this.#sequenceBlockData;
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

export { SequenceParser, N_RF_CHANNELS, expandToWaveform };
