import { useState, useEffect } from "react";
import { Container, Form, Button } from "react-bootstrap";
import Cookies from "js-cookie";
import { setValidatedProxy } from "./ConnectionState";

function Configurator() {
  const [validated, setValidated] = useState(false);
  setValidatedProxy.func = setValidated;
  const api = Cookies.withAttributes({
    sameSite: "lax",
  });
  if (api.get("libraryAddress") === undefined) {
    api.set("libraryAddress", "localhost");
  }
  if (api.get("libraryPort") === undefined) {
    api.set("libraryPort", "8003");
  }

  return (
    <Container>
      <Form
        name="Experiment library"
        noValidate
        validated={validated}
        onSubmit={(e) => {
          api.set("libraryAddress", e.target[0].value);
          api.set("libraryPort", e.target[1].value);
        }}
      >
        <Form.Group className="mb-3">
          <Form.Label>Experiment library URL or IP address</Form.Label>
          <Form.Control
            type="text"
            defaultValue={api.get("libraryAddress")}
            isInvalid={!validated}
          />
          <Form.Label>Experiment library port</Form.Label>
          <Form.Control
            type="text"
            defaultValue={api.get("libraryPort")}
            isInvalid={!validated}
          />
        </Form.Group>
        <Button type="submit">Connect</Button>
      </Form>
    </Container>
  );
}

export { Configurator };
