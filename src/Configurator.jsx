import { useState, useEffect, useRef } from "react";
import { Container, Form, Button } from "react-bootstrap";
import { useNavigate } from "react-router";

function Configurator({ library, setLibrary }) {
  const [validated, setValidated] = useState(true);
  const redirect = useRef(false);

  const controller = new AbortController();
  useEffect(() => {
    const url = `${library.address}:${library.port}`;
    const hardware_url = `http://${url}/Hardware/description`;
    setTimeout(() => controller.abort(), 200);
    fetch(hardware_url, { signal: controller.signal })
      .then((response) => {
        setValidated(response.ok);
        if (redirect.current && response.ok) {
          redirect.current = false;
          navigate("/plot");
        }
      })
      .catch((response) => {
        setValidated(false);
      });
  }, [library.address, library.port, redirect.current]);

  const navigate = useNavigate();

  return (
    <Container>
      <Form
        name="Experiment library"
        noValidate
        validated={validated}
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
            isInvalid={!validated}
          />
          <Form.Label>Experiment library port</Form.Label>
          <Form.Control
            type="text"
            defaultValue={library.port}
            isInvalid={!validated}
          />
        </Form.Group>
        <Button type="submit">Connect</Button>
      </Form>
    </Container>
  );
}

export { Configurator };
