import { useState, useEffect, useRef } from "react";
import { Container, Form, Button, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router";
import { ConnectionStatus } from "./ConnectionStatus";

function Configurator({ library, setLibrary, connectionStatus }) {
  const redirect = useRef(false);
  const navigate = useNavigate();

  if (redirect.current && connectionStatus === ConnectionStatus.connected) {
    redirect.current = false;
    // navigate("/plot");
  }

  return (
    <Container>
      <Form
        name="Experiment library"
        noValidate
        validated={connectionStatus === ConnectionStatus.connected}
        onSubmit={async (e) => {
          e.preventDefault();
          const newLibrary = {
            address: e.target[0].value,
            port: e.target[1].value,
          };
          redirect.current = true;
          setLibrary(newLibrary);
        }}
      >
        <Form.Group className="mb-3">
          <Form.Label>Experiment library URL or IP address</Form.Label>
          <Form.Control
            type="text"
            defaultValue={library.address}
            isInvalid={connectionStatus === ConnectionStatus.failed}
          />
          <Form.Label>Experiment library port</Form.Label>
          <Form.Control
            type="text"
            defaultValue={library.port}
            isInvalid={connectionStatus === ConnectionStatus.failed}
          />
        </Form.Group>
        <Button type="submit">Connect</Button>
      </Form>
      {connectionStatus === ConnectionStatus.connecting ? (
        <Spinner className="m-3" animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      ) : (
        <></>
      )}
    </Container>
  );
}

export { Configurator };
