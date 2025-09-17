import { useState, useEffect, useRef } from "react";
import { Container, Button } from "react-bootstrap";
import { JsonEditor } from "json-edit-react";
import Switch from "react-switch";

function DescriptionOverride({
  description,
  setDescription,
  overrideOn,
  setOverrideOn,
}) {
  const [localDescription, setLocalDescription] = useState(description);

  const setData = (sequence) => {
    setLocalDescription(sequence);
    if (overrideOn) {
      setDescription(sequence);
    }
  };

  return (
    <Container>
      <label>
        <span>Override </span>
        <Switch onChange={setOverrideOn} checked={overrideOn} />
      </label>
      <Button
        onClick={() => {
          setLocalDescription(description);
          setDescription(description);
        }}
      >
        Update
      </Button>
      <JsonEditor
        data={overrideOn ? localDescription : description}
        setData={setData}
        restrictEdit={!overrideOn}
      />
    </Container>
  );
}

export { DescriptionOverride };
