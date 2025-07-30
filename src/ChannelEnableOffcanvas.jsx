import { useState, memo } from "react";
import Button from "react-bootstrap/Button";
import Offcanvas from "react-bootstrap/Offcanvas";
import { EnablingGroup } from "./VisualiserConfiguration";

const ChannelEnableOffcanvas = memo(function EnablingGroupOff({
  channelDescription,
  channelEnabled,
  availableChannels,
  handleEnableChange,
}) {
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  return (
    <>
      <div
        style={{
          position: "fixed",
          bottom: "8px",
          right: "8px",
        }}
      >
        <Button variant="primary" onClick={handleShow}>
          Channels
        </Button>
      </div>

      <Offcanvas show={show} onHide={handleClose}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Channels to display</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <EnablingGroup
            channelDescription={channelDescription}
            channelEnabled={channelEnabled}
            availableChannels={availableChannels}
            onEvent={handleEnableChange}
          />
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
});

export default ChannelEnableOffcanvas;
