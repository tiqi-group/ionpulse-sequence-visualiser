import { useState, useEffect, useRef } from "react";
import { Container, Button } from "react-bootstrap";
import { JsonEditor } from "json-edit-react";
import Switch from "react-switch";

function DescriptionOverride({
  description: remoteDescription,
  setDescription: setUsedDescription,
  overrideOn,
  setOverrideOn,
}) {
  const [localDescription, setLocalDescription] = useState(remoteDescription);

  const localDescriptionModified = useRef(false);

  const setData = (sequence) => {
    localDescriptionModified.current = true;
    setLocalDescription(sequence);
    if (overrideOn) {
      setUsedDescription(sequence);
    }
  };

  const setOverrideOnLocal = (newOverrideOn) => {
    if (newOverrideOn && !localDescriptionModified.current) {
      // Local description needs to be updated, don't touch used description
      setLocalDescription(remoteDescription);
    } else {
      setUsedDescription(newOverrideOn ? localDescription : remoteDescription);
    }
    setOverrideOn(newOverrideOn);
  };

  return (
    <Container className="my-4">
      <label>
        <span className="align-middle mx-2">Override</span>
        <Switch
          className="align-middle"
          onChange={setOverrideOnLocal}
          checked={overrideOn}
        />
      </label>
      <Button
        className="align-middle mx-4"
        onClick={() => {
          setLocalDescription(remoteDescription);
          setUsedDescription(remoteDescription);
        }}
      >
        Reset JSON
      </Button>
      <JsonEditor
        className="mt-2"
        data={overrideOn ? localDescription : remoteDescription}
        setData={setData}
        restrictEdit={!overrideOn}
      />
    </Container>
  );
}

export { DescriptionOverride };
