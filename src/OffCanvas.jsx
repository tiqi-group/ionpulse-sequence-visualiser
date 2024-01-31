import { useState } from "react";
import Button from "react-bootstrap/Button";
import Offcanvas from "react-bootstrap/Offcanvas";

function EnablingGroupOff(input) {
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
          <Offcanvas.Title>Offcanvas</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>{input.Enablers}</Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

export default EnablingGroupOff;
