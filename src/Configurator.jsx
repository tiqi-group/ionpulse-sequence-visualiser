import { useState, useEffect, useRef } from "react";
import { Container, Form, Button, Spinner } from "react-bootstrap";
import { ConnectionStatus } from "./ConnectionStatus";

function Configurator({ library, setLibrary, connectionStatus }) {
  const redirect = useRef(false);

  if (redirect.current && connectionStatus === ConnectionStatus.connected) {
    redirect.current = false;
  }

  let postElements = [];
  if (
    location.protocol === "https:" &&
    connectionStatus === ConnectionStatus.failed
  ) {
    postElements.push(
      <div key="0" class="alert alert-warning mt-3" role="alert">
        Please make sure that mixed/insecure content is enabled. Click the
        lock/settings icon left of the URL in your browser
        <ul>
          <li>
            Chrome:{" "}
            <a href="https://support.google.com/chrome/answer/114662">
              https://support.google.com/chrome/answer/114662
            </a>{" "}
          </li>
          <li>
            Firefox:{" "}
            <a href="https://support.mozilla.org/en-US/kb/mixed-content-blocking-firefox">
              https://support.mozilla.org/en-US/kb/mixed-content-blocking-firefox
            </a>
          </li>
        </ul>
      </div>,
    );
  }
  if (connectionStatus === ConnectionStatus.connecting) {
    postElements.push(
      <Spinner key="1" className="m-3" animation="border" role="status">
        <span className="visually-hidden">Loading...</span>
      </Spinner>,
    );
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
      {postElements}
    </Container>
  );
}

export { Configurator };
