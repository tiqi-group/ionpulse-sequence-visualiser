import { useState, useEffect } from "react";
import { Container, Form, Button } from "react-bootstrap";
import { Cookies } from "./Cookies";
import { setValidatedProxy } from "./ConnectionState";

function Configurator() {
  const [validated, setValidated] = useState(false);
  setValidatedProxy.func = setValidated;

  return (
    <Container>
      <Form
        name="Experiment library"
        noValidate
        validated={validated}
        onSubmit={(e) => {
          Cookies.set("libraryAddress", e.target[0].value);
          Cookies.set("libraryPort", e.target[1].value);
        }}
      >
        <Form.Group className="mb-3">
          <Form.Label>Experiment library URL or IP address</Form.Label>
          <Form.Control
            type="text"
            defaultValue={Cookies.get("libraryAddress")}
            isInvalid={!validated}
          />
          <Form.Label>Experiment library port</Form.Label>
          <Form.Control
            type="text"
            defaultValue={Cookies.get("libraryPort")}
            isInvalid={!validated}
          />
        </Form.Group>
        <Button type="submit">Connect</Button>
      </Form>
    </Container>
  );
}

export { Configurator };
