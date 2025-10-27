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
}) {
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
  const localDescriptionModified = useRef(
    sessionStorage.getItem(localDescriptionKey) != null,
  );

  useEffect(() => {
    if (localDescriptionModified) {
      sessionStorage.setItem(
        localDescriptionKey,
        JSON.stringify(localDescription),
      );
    }
  }, [localDescription, localDescriptionModified]);

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
      <pre
        className={
          "my-2 border" +
          (overrideOn ? "" : " bg-secondary-subtle") +
          (jsonParserErrorString != "" ? " border-danger" : "")
        }
        contentEditable={overrideOn ? "plaintext-only" : "false"}
        suppressContentEditableWarning={true}
        onBlur={(e) => {
          try {
            const newData = JSON.parse(e.currentTarget.textContent);
            setData(newData);
            setJsonParserErrorString("");
            setLastJsonParserErrorString("");
          } catch (error) {
            setJsonParserErrorString(error.toString());
          }
        }}
        style={{
          height: "85vh",
          "overflow-y": "scroll",
        }}
      >
        <code>
          {JSON.stringify(
            overrideOn ? localDescription : remoteDescription,
            null,
            2,
          )}
        </code>
      </pre>
      {
        // <JsonEditor
        //   className="mt-2"
        //   data={overrideOn ? localDescription : remoteDescription}
        //   setData={setData}
        //   restrictEdit={!overrideOn}
        // />
      }
    </Container>
  );
}

export { DescriptionOverride };
