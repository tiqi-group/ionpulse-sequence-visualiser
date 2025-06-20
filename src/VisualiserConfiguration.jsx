import React, { memo } from "react";
import {
  Container,
  ToggleButton,
  ButtonGroup,
  Row,
  Col,
} from "react-bootstrap";
import { channelGroups } from "./Hardware";

const EnableChannel = memo(function EnableChannel({
  channelName,
  displayName,
  isEnabled,
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
        onClick={() => {
          onClick({ name: channelName });
        }}
      >
        {displayName}
      </ToggleButton>
    </ButtonGroup>
  );
});

const EnablingGroup = memo(function EnablingGroup({
  channelDescription,
  channelEnabled,
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
  let nRows = 0;
  for (const type of channelGroups) {
    elementKeyByGroup[type].sort((a, b) =>
      ("" + channelDescription[a].name).localeCompare(
        channelDescription[b].name,
      ),
    );
    nRows = Math.max(elementKeyByGroup[type].length, nRows);
  }

  const rows = Array.from(Array(nRows).keys()).map((row) => {
    let cols = [];
    for (const type of channelGroups) {
      if (row < elementKeyByGroup[type].length) {
        cols.push(
          <EnableChannel
            channelName={elementKeyByGroup[type][row]}
            displayName={channelDescription[elementKeyByGroup[type][row]].name}
            onClick={onEvent}
            isEnabled={channelEnabled[elementKeyByGroup[type][row]]}
            key={"enableCol" + elementKeyByGroup[type][row]}
          />,
        );
      } else {
        cols.push(<Col key={"enableCol" + type + row}></Col>);
      }
    }
    return (
      <Row key={"enableRow" + row} xs={1} sm={4} md={4}>
        {cols}
      </Row>
    );
  });

  return <Container>{rows}</Container>;
});

export { EnablingGroup };
