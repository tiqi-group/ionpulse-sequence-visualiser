import React, { memo } from "react";
import Grid from "@mui/material/Grid";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { green, grey } from "@mui/material/colors";

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#1A2027" : "#fff",
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: "center",
  color: theme.palette.text.secondary,
}));

const enableChannelStyle = {
  fontSize: 14,
  textAlign: "center",
  lineHeight: "50px",
  height: "50px",
};
const style_enabled = {
  ...enableChannelStyle,
  color: green[900],
  backgroundColor: "white",
};

const style_disabled = {
  ...enableChannelStyle,
  color: grey[900],
  backgroundColor: grey[200],
};

const EnableChannel = memo(function EnableChannel({
  channelName,
  displayName,
  isEnabled,
  onClick,
}) {
  return (
    <div className="col" style={isEnabled ? style_enabled : style_disabled}>
      <React.Fragment>
        <p onClick={() => onClick({ name: channelName })}>{displayName}</p>
      </React.Fragment>
    </div>
  );
});

const EnablingGroup = memo(function EnablingGroup({
  channelDescription,
  channelEnabled,
  onEvent,
}) {
  const nRows = Object.values(channelDescription).reduce(
    (count, val) => (count += val.group === "RF"),
    0,
  );

  const rows = Array.from(Array(Math.max(nRows, 32)).keys()).map((row) => {
    let cols = [];
    for (const type of ["RF", "TTL", "PMT"]) {
      let elementKey = type + row;
      if (elementKey in channelDescription) {
        cols.push(
          <EnableChannel
            channelName={elementKey}
            displayName={channelDescription[elementKey].name}
            onClick={onEvent}
            isEnabled={channelEnabled[elementKey]}
            key={"enableCol" + elementKey}
          />,
        );
      } else {
        cols.push(<div className="col" key={"enableCol" + elementKey}></div>);
      }
    }
    return (
      <div className="container" key={"enablerRow" + row}>
        <div className="row justify-content-center">{cols}</div>
      </div>
    );
  });

  return (
    <div>
      <Box sx={{ flexGrow: 1 }}>
        <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
          {rows}
        </Grid>
      </Box>
    </div>
  );
});

export { EnablingGroup };
