import React, { memo } from "react";
import {
  Container,
  ToggleButton,
  ButtonGroup,
  Row,
  Col,
} from "react-bootstrap";
import { channelGroups } from "./Hardware";

const maxButtonChars = 24;

const EnableChannel = memo(function EnableChannel({
  channelName,
  displayName,
  isEnabled,
  isAvailable,
  onClick,
}) {
  return (
    <ButtonGroup className="mb-1">
      <ToggleButton
        id={channelName}
        type="checkbox"
        variant="outline-primary"
        value="1"
        checked={isEnabled}
        disabled={!isEnabled && !isAvailable}
        onClick={() => {
          onClick({ name: channelName });
        }}
        title={displayName.length > maxButtonChars ? displayName : ""}
      >
        {displayName.length > maxButtonChars
          ? displayName.substring(0, maxButtonChars - 2) + "..."
          : displayName}
      </ToggleButton>
    </ButtonGroup>
  );
});

const EnablingGroup = memo(function EnablingGroup({
  channelDescription,
  channelEnabled,
  availableChannels,
  onEvent,
}) {
  let elementKeyByGroup = Object.entries(channelDescription).reduce(
    (prev, kv_tuple) => {
      prev[kv_tuple[1]["group"]].push(kv_tuple[0]);
      return prev;
    },
    channelGroups.reduce((prev, group) => {
      prev[group] = [];
      return prev;
    }, {}),
  );
  for (const type of channelGroups) {
    elementKeyByGroup[type].sort((a, b) =>
      ("" + channelDescription[a].name).localeCompare(
        channelDescription[b].name,
      ),
    );
  }

  const cols = [["RF"], ["TTL", "PMT", "Readout"]].map((typeList) => {
    let rows = [
      <h4 key={"colHeader" + typeList[1]}>
        {typeList.reduce((h, el) => (h === "" ? el : h + ", " + el), "")}
      </h4>,
    ];
    for (const type of typeList) {
      for (const elementKey of elementKeyByGroup[type]) {
        rows.push(
          <Row key={elementKey}>
            <EnableChannel
              channelName={elementKey}
              displayName={channelDescription[elementKey].name}
              onClick={onEvent}
              isEnabled={channelEnabled[elementKey]}
              isAvailable={availableChannels[elementKey]}
            />
          </Row>,
        );
      }
    }
    return <Col key={"enableCol" + typeList[1]}>{rows}</Col>;
  });

  return (
    <Container>
      <Row xs={1} sm={2} md={2}>
        {cols}
      </Row>
    </Container>
  );
});

export { EnablingGroup };
