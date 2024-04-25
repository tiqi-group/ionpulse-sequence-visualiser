import React, { memo } from "react";
import {
  Container,
  ToggleButton,
  ButtonGroup,
  Row,
  Col,
} from "react-bootstrap";

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
  const nRows = Object.values(channelDescription).reduce(
    (count, val) => (count += val.group === "RF"),
    0,
  );

  const rows = Array.from(Array(Math.max(nRows, 32)).keys()).map((row) => {
    let cols = [];
    for (const type of ["RF", "TTL", "PMT"]) {
      let elementKey = type + row;
      if (elementKey in channelDescription) {
        cols.push(
          <EnableChannel
            channelName={elementKey}
            displayName={channelDescription[elementKey].name}
            onClick={onEvent}
            isEnabled={channelEnabled[elementKey]}
            key={"enableCol" + elementKey}
          />,
        );
      } else {
        cols.push(<Col key={"enableCol" + elementKey}></Col>);
      }
    }
    return (
      <Row key={"enableRow" + row} xs={1} sm={3} md={3}>
        {cols}
      </Row>
    );
  });

  return <Container>{rows}</Container>;
});

export { EnablingGroup };
