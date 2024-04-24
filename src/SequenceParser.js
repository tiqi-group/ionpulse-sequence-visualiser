const ChannelSequenceType = {
  rf: "rf_channel_sequences",
  dio: "digital_io",
  readout: "readout",
  qubit: "qubit_sequences",
};

const N_RF_CHANNELS = 32;
const N_TTL_CHANNELS = 32;
const N_PMT_CHANNELS = 8;

function stripIdxFromName(name) {
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

      this.#sequenceConfig.push({
        display: "full",
        paths: [],
        ...externalConfig[name],
      });

      settings["calls"] = [];
      settings["ch_mask"] = entry["ch_mask"];
      settings["type"] = entry["type"];
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
      let data = {
        freq: [0],
        phase: [0],
        amp: [0],
        time: [0],
        names: [["start"], []],
        timeDomain: [0],
      };
      let loopIteration = 0;
      plotData["RF" + rf_idx] = this.getDataForChannel(
        this.#main["Sequence"].length - 1,
        ChannelSequenceType.rf,
        rf_idx,
        data,
        loopIteration,
        0,
        true,
      );
      if (plotData["RF" + rf_idx]["timeDomain"].length % 2 == 1)
        plotData["RF" + rf_idx]["timeDomain"].pop();
      plotData["RF" + rf_idx]["names"].pop();
    }
    for (let i = -N_PMT_CHANNELS; i < N_TTL_CHANNELS; i++) {
      let data = {
        values: [0],
        time: [0],
        names: [["start"], []],
        timeDomain: [0],
      };
      let loopIteration = 0;
      let name = i < 0 ? "PMT" + (8 + i) : "TTL" + i;
      plotData[name] = this.getDataForChannel(
        this.#main["Sequence"].length - 1,
        ChannelSequenceType.dio,
        i,
        data,
        loopIteration,
        0,
        true,
      );
      if (plotData[name]["timeDomain"].length % 2 == 1)
        plotData[name]["timeDomain"].pop();
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
        this.#sequenceBlockData[idx]["calls"].length
      ) {
        this.#sequenceConfig[idx]["paths"].push(0);
      }
      channelSequence = [
        seq["paths"][
          this.#sequenceConfig[idx]["paths"][
            this.#sequenceBlockData[idx]["calls"].length
          ]
        ],
      ];
    } else if (
      channelType === ChannelSequenceType.rf ||
      channelType === ChannelSequenceType.qubit_sequences
    ) {
      channelSequence = seq[channelType][channelIdx];
    } else {
      channelSequence = seq[channelType];
    }
    let baseName = "";
    if (!this.#sequenceBlockData[idx]["name"] !== "main") {
      baseName = this.#sequenceBlockData[idx]["name"];
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
            return call[key] == data["timeDomain"].at(-1);
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
            return call[key] == data["timeDomain"].at(-1);
          })
        ) {
          console.log(this.#sequenceBlockData[idx]);
        }
      }
    };
    for (let i = 0; i < iterations; i++) {
      let iterationName = baseName;
      if (isLoop) iterationName += "[" + i + "]";
      if (isFork)
        iterationName +=
          "{" +
          this.#sequenceConfig[idx]["paths"][
            this.#sequenceBlockData[idx]["calls"].length - 1
          ] +
          "}";
      if (iterationName.length > 0) data["names"].at(-1).push(iterationName);
      storeTime("startTime", iterationName);
      let recordEventsLocal =
        recordEvents &&
        (this.#sequenceConfig[idx]["display"] == "full" ||
          (this.#sequenceConfig[idx]["display"] == "minimized" &&
            i == 0 &&
            this.sequenceBlockData[idx]["calls"].length == 1));
      if (data["timeDomain"].length % 2 == recordEventsLocal) {
        // If it's even and not record or if it's odd and record
        data["timeDomain"].push(data["timeDomain"].at(-1));
      }
      for (let event of channelSequence) {
        if (typeof event === "object") {
          event = event[0];
        }
        if (event < this.#main["Event"].length) {
          data = this.getEventDataForChannel(
            event,
            channelType,
            channelIdx,
            data,
            loopIteration + i,
            recordEventsLocal,
          );
        } else {
          data = this.getDataForChannel(
            event - this.#main["Event"].length,
            channelType,
            channelIdx,
            data,
            loopIteration + i,
            depth + 1,
            recordEventsLocal,
          );
        }
      }
      if (iterationName.length > 0) data["names"].at(-1).pop();
      storeTime("endTime");
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
    let mainType =
      type.substring(0, 1).toUpperCase() + type.substring(1, type.length);
    let param = this.#main[mainType][idx];
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
    data["names"].at(-2).push(stripIdxFromName(event["name"]));

    switch (event["type"]) {
      case "RFEdge":
        for (let type of ["time", "freq", "phase", "amp"]) {
          data = this.getParamValue(
            type,
            event[type],
            channelType,
            channelIdx,
            data,
            loopIteration,
            recordEvents,
          );
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
          for (let type of ["freq", "phase", "amp"]) {
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

function expandToWaveform(sequenceData) {
  // time is in units of us so sampling rate of 10 equal 10 MSPS
  const samplingRate = 10;
  let nSamples = 0;
  for (let i = 0; i < sequenceData["time"].length - 1; i++) {
    let a = i === 0 ? 0 : sequenceData["amp"][i - 1];
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
    let f, p, a, t;
    if (i === 0) {
      f = 0;
      p = 0;
      a = 0;
    } else {
      f = sequenceData["freq"][i];
      p = sequenceData["phase"][i];
      a = sequenceData["amp"][i];
    }
    t = sequenceData["time"][i];

    if (a === 0) {
      // console.log(`Expanding ${0} amplitude from ${t.toFixed(3)} to ${(t + duration).toFixed(3)}`);
      time[currentIdx] = t;
      time[currentIdx + 1] = sequenceData["time"][i + 1];
      value[currentIdx] = 0;
      value[currentIdx + 1] = 0;
      currentIdx += 2;
    } else {
      const segmentSamples = Math.ceil(duration * samplingRate);
      // console.log(`Expanding ${segmentSamples} samples from ${t.toFixed(3)} to ${(t + duration).toFixed(3)}, f: ${f.toFixed(2)}, a: ${a.toFixed(2)}, p: ${p.toFixed(2)}`);
      // Optionally use relative time
      const segmentTime = Array.from(
        { length: segmentSamples },
        (_, idx) => t + idx * (duration / segmentSamples),
      );
      segmentTime.forEach((timeVal, idx) => {
        time[currentIdx + idx] = timeVal;
        value[currentIdx + idx] =
          a * Math.cos(2 * Math.PI * (f * 0.001 * timeVal + p / 360));
      });
      currentIdx += segmentSamples;
    }
  }

  return [time, value];
}

export { SequenceParser, N_RF_CHANNELS, expandToWaveform };
