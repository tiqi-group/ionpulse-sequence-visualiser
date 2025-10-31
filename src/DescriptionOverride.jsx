import { useEffect, useState, useCallback, useRef } from "react";
import { Container, Button, Modal } from "react-bootstrap";
import { JsonEditor } from "json-edit-react";
import Switch from "react-switch";
import { useDropzone } from "react-dropzone";

function DescriptionOverride({
  prefix,
  remoteDescription,
  setUsedDescription,
  overrideOn,
  setOverrideOn,
  defaultDescription,
}) {
  console.log(defaultDescription);
  const [jsonParserErrorString, setJsonParserErrorString] = useState("");
  const [lastJsonParserErrorString, setLastJsonParserErrorString] =
    useState("");
  const localDescriptionKey = prefix + "localDescription";
  const [localDescription, setLocalDescription] = useState(() => {
    let init;
    try {
      init = JSON.parse(sessionStorage.getItem(localDescriptionKey));
    } catch (error) {
      setJsonParserErrorString(error.toString());
      console.warn(
        "invalid entry in sessionStorage for '" + prefix + " localDescription'",
      );
    }
    if (init == null) {
      init = {};
    }
    return init;
  });

  // localDescriptionModified is true once there is a user-defined value.
  const localDescriptionModified = useRef(
    sessionStorage.getItem(localDescriptionKey) != null,
  );

  useEffect(() => {
    if (localDescriptionModified.current) {
      sessionStorage.setItem(
        localDescriptionKey,
        JSON.stringify(localDescription),
      );
    }
  }, [localDescription, localDescriptionModified]);

  const setData = (sequence) => {
    localDescriptionModified.current = true;
    setLocalDescription(sequence);
    console.log("setData: ", sequence);
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

  const onDrop = useCallback(
    (acceptedFiles) => {
      acceptedFiles.forEach((file) => {
        const reader = new FileReader();

        reader.onload = () => {
          setOverrideOnLocal(true);
          try {
            const newData = JSON.parse(new TextDecoder().decode(reader.result));
            setData(newData);
            setJsonParserErrorString("");
            setLastJsonParserErrorString("");
          } catch (error) {
            setJsonParserErrorString(error.toString());
          }
        };

        reader.readAsArrayBuffer(file);
      });
    },
    [setOverrideOnLocal, setData],
  );
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: onDrop,
    accept: {
      "application/json": [".json", ".json5"],
    },
    maxFiles: 1,
  });

  const jsonString = JSON.stringify(
    overrideOn ? localDescription : remoteDescription,
    null,
    2,
  );

  return (
    <Container className="my-4" {...getRootProps()}>
      <h2>
        {overrideOn ? "Local" : "Remote"} JSON {prefix} description
      </h2>
      <div className="my-2 height">
        <label>
          <span className="align-middle m-2">Override</span>
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
          disabled={!overrideOn}
        >
          Replace local with remote JSON
        </Button>
        {defaultDescription !== undefined ? (
          <Button
            className="align-middle mx-4"
            onClick={() => {
              setLocalDescription(defaultDescription);
              if (overrideOn) {
                setUsedDescription(defaultDescription);
              }
            }}
          >
            Use default {prefix} description
          </Button>
        ) : (
          <></>
        )}
      </div>
      <p className="m-2">
        Drag and drop json file or edit while override is activated
      </p>
      <Modal
        show={jsonParserErrorString != lastJsonParserErrorString}
        onHide={() => setLastJsonParserErrorString(jsonParserErrorString)}
      >
        <Modal.Header>
          <Modal.Title>JSON parser error</Modal.Title>
        </Modal.Header>
        <Modal.Body>{jsonParserErrorString}</Modal.Body>
      </Modal>
      <div
        className={
          "my-2 border" +
          (overrideOn ? "" : " bg-secondary-subtle") +
          (jsonParserErrorString != "" ? " border-danger" : "")
        }
        style={{
          height: "85vh",
          overflowY: "scroll",
          position: "relative",
          fontFamily: "monospace",
          fontSize: "inherit",
        }}
      >
        <pre
          style={{
            pointerEvents: "none",
            position: "relative",
            fontFamily: "inherit",
            fontSize: "inherit",
          }}
        >
          <code>{jsonString}</code>
        </pre>
        <textarea
          value={jsonString}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: "100%",
            resize: "none",
            padding: 0,
            border: 0,
            MozOsxFontSmoothing: "grayscale",
            WebkitFontSmoothing: "antialiased",
            WebkitTextFillColor: "transparent",
            background: "none",
            fontFamily: "inherit",
            fontSize: "inherit",
          }}
          onChange={(e) => {
            try {
              console.log(e.currentTarget);
              const newData = JSON.parse(e.currentTarget.value);
              setData(newData);
              setJsonParserErrorString("");
              setLastJsonParserErrorString("");
            } catch (error) {
              setJsonParserErrorString(error.toString());
            }
          }}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          data-gramm={false}
        />
      </div>
    </Container>
  );
}

export { DescriptionOverride };
