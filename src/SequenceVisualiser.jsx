import { useState } from "react";

import EnablingGroupOff from "./OffCanvas";
import { PulseSequencePlot } from "./PulseSequencePlot";
import { SequenceBlockPlot } from "./SequenceBlockPlot";
import { Container, Row, Col } from "react-bootstrap";

const SequenceVisualiser = function SequenceVisualiser({
  channelDescription,
  pulseSequenceData,
  sequenceBlockData,
  sequenceConfig,
  setSequenceConfig,
}) {
  const [channelEnabled, setChannelEnabled] = useState(() => {
    return Object.keys(channelDescription).reduce((init, k) => {
      init[k] = false;
      return init;
    }, {});
  });

  const channelEnabledKeys = Object.keys(channelEnabled);
  const channelDescKeys = Object.keys(channelDescription);
  const allKeys = channelEnabledKeys.concat(channelDescKeys);
  const union = new Set(allKeys);

  if (union.size !== channelEnabledKeys.length) {
    let newChannelEnabled = { ...channelEnabled };
    for (const k of channelDescKeys) {
      if (!(k in channelEnabled)) {
        newChannelEnabled[k] = false;
      }
    }
    setChannelEnabled(newChannelEnabled);
  }

  function handleEnableChange(e) {
    let newChannelEnabled = { ...channelEnabled };
    newChannelEnabled[e.name] = !newChannelEnabled[e.name];
    setChannelEnabled(newChannelEnabled);
  }

  const minimumSequenceTime = 20;
  const totalTime = sequenceBlockData.at(-1)["calls"].at(-1)["endTime"];
  const xDomains = sequenceBlockData.slice(0, -1).reduce(
    (domain, seq) => {
      if (
        sequenceConfig[seq["name"]] &&
        sequenceConfig[seq["name"]]["display"] == "hide"
      ) {
        let excluded_calls = seq["calls"];
        if (seq["type"] === "Loop") {
          const loopStartIndices = seq["calls"].reduce((indices, call, i) => {
            if (call["name"].substring(seq["name"].length) === "[0]") {
              indices.push(i);
            }
            return indices;
          }, []);
          excluded_calls = loopStartIndices.map(
            (callIndex, i, loopStartIndices) => {
              const endTime =
                i < loopStartIndices.length - 1
                  ? seq["calls"][loopStartIndices[i + 1]]["startTime"]
                  : seq["calls"].at(-1)["endTime"];
              return {
                startTime: seq["calls"][callIndex + 1]["startTime"],
                endTime: endTime,
              };
            },
          );
        }
        for (const call of excluded_calls) {
          const startTime = Math.max(call["startTime"], minimumSequenceTime);
          // >= to make sure we merge with subsequent time domain
          const startIdx = domain.findIndex((val) => val >= startTime);
          let domainStart = domain.slice(0, startIdx);
          // Check if startIdx is odd (i.e. index of an end time)
          if (startIdx % 2 == 1) {
            // Push startTime because it now ends the previous domain (current call is hidden)
            domainStart.push(startTime);
          }
          console.assert(domainStart.length % 2 == 0); // domainStart has to contain pairs of start and end time
          const endIdx = domain.findIndex((val) => val > call["endTime"]);
          // If endIdx is even, the sequence ends during an already excluded slot
          // and we don't have to start a new time domain
          let domainEnd = endIdx % 2 == 1 ? [call["endTime"]] : [];
          if (endIdx >= 0) {
            domainEnd = domainEnd.concat(domain.slice(endIdx));
          }
          console.assert(domainEnd.length % 2 == 0);
          domain = domainStart.concat(domainEnd);
        }
      }
      return domain;
    },
    [0, totalTime],
  );
  const maxTimePad = 10;
  // Transform linear array of length 2n to array of pairs of length n
  const timeDomains = xDomains.reduce((domains, entry, i, timeDomains) => {
    if (i % 2 == 0) {
      const timePad =
        i == 0 ? 0 : Math.min(maxTimePad, (entry - timeDomains[i - 1]) / 2);
      domains.push([entry - timePad]);
    } else {
      const timePad =
        i == timeDomains.length - 1
          ? Math.min(maxTimePad, totalTime - entry)
          : Math.min(maxTimePad, (timeDomains[i + 1] - entry) / 2);
      domains.at(-1).push(entry + timePad);
    }
    return domains;
  }, []);

  const totalWidth = 1000;

  return (
    <div className="mx-3">
      <EnablingGroupOff
        channelDescription={channelDescription}
        channelEnabled={channelEnabled}
        handleEnableChange={handleEnableChange}
      />
      <Row>
        <Col>
          <h2>Pulse sequence plot</h2>
          <PulseSequencePlot
            channelDescription={channelDescription}
            channelEnabled={channelEnabled}
            sequenceData={pulseSequenceData}
            sequenceBlockData={sequenceBlockData}
          />
        </Col>
        <Col>
          <h2>Sequence block plot</h2>
          <SequenceBlockPlot
            channelDescription={channelDescription}
            channelEnabled={channelEnabled}
            sequenceBlockData={sequenceBlockData}
            timeDomain={[xDomains[0], xDomains.at(-1)]}
            plotWidth={totalWidth}
            margin={{ t: 100, b: 40, l: 100, r: 0 }}
            sequenceConfig={sequenceConfig}
            setSequenceConfig={setSequenceConfig}
          />
        </Col>
      </Row>
    </div>
  );
};

export { SequenceVisualiser };
